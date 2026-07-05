const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const questions = require('./questions');

const PORT = process.env.PORT || 3000;
const MIN_PLAYERS = 3;
const MAX_PLAYERS = 12;
const ROOM_TTL_AFTER_EMPTY_MS = 60 * 1000;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

/** @type {Record<string, Room>} */
const rooms = {};

// ---------- helpers ----------

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid confusion

function generateCode() {
  let code;
  do {
    code = '';
    for (let i = 0; i < 5; i++) {
      code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }
  } while (rooms[code]);
  return code;
}

function shuffledIndices(len) {
  const arr = Array.from({ length: len }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function connectedPlayers(room) {
  return room.players.filter((p) => p.connected);
}

function publicPlayers(room) {
  return room.players.map((p) => ({
    id: p.id,
    name: p.name,
    score: p.score,
    connected: p.connected,
  }));
}

function sanitizeName(raw, fallback) {
  const cleaned = (raw || '').toString().trim().replace(/\s+/g, ' ').slice(0, 20);
  return cleaned || fallback;
}

function uniqueName(room, desired) {
  let final = desired;
  let n = 2;
  while (room.players.some((p) => p.name === final)) {
    final = `${desired} (${n++})`;
  }
  return final;
}

function broadcastRoomUpdate(code) {
  const room = rooms[code];
  if (!room) return;
  io.to(code).emit('roomUpdate', {
    code,
    state: room.state,
    players: publicPlayers(room),
    rounds: room.rounds,
    currentRound: room.currentRound,
    hostId: room.hostId,
  });
}

function scheduleCleanup(code) {
  setTimeout(() => {
    const room = rooms[code];
    if (room && room.players.every((p) => !p.connected)) {
      delete rooms[code];
    }
  }, ROOM_TTL_AFTER_EMPTY_MS);
}

// ---------- game flow ----------

function startRound(room) {
  room.currentRound += 1;
  room.answers = {};
  room.votes = {};

  if (room.questionPool.length === 0) {
    room.questionPool = shuffledIndices(questions.length);
  }
  const qIdx = room.questionPool.pop();
  const q = questions[qIdx];

  const candidates = connectedPlayers(room);
  let liarPool = candidates.filter((p) => p.id !== room.prevLiarId);
  if (liarPool.length === 0) liarPool = candidates;
  const liar = liarPool[Math.floor(Math.random() * liarPool.length)];
  room.prevLiarId = liar.id;

  room.currentQuestion = { realText: q.real, fakeText: q.fake, liarId: liar.id };
  room.state = 'answering';

  room.players.forEach((p) => {
    const text = p.id === liar.id ? q.fake : q.real;
    io.to(p.id).emit('newRound', {
      roundNumber: room.currentRound,
      totalRounds: room.rounds,
      question: text,
    });
  });

  broadcastRoomUpdate(room.code);
}

function revealAnswers(room) {
  room.state = 'reveal';
  const answersList = room.players
    .filter((p) => p.connected || room.answers[p.id])
    .map((p) => ({
      playerId: p.id,
      name: p.name,
      answer: room.answers[p.id] || '(brak odpowiedzi)',
    }));

  io.to(room.code).emit('answersReveal', {
    realQuestion: room.currentQuestion.realText,
    answers: answersList,
  });
  broadcastRoomUpdate(room.code);
}

function startVoting(room) {
  room.state = 'voting';
  io.to(room.code).emit('votingStart', {
    players: room.players.filter((p) => p.connected).map((p) => ({ id: p.id, name: p.name })),
  });
  broadcastRoomUpdate(room.code);
}

function finishVoting(room) {
  room.state = 'results';
  const liarId = room.currentQuestion.liarId;

  const tally = {};
  room.players.forEach((p) => (tally[p.id] = 0));
  Object.values(room.votes).forEach((v) => {
    if (tally[v] !== undefined) tally[v]++;
  });

  const maxVotes = Math.max(0, ...Object.values(tally));
  const topVoted = Object.keys(tally).filter((id) => maxVotes > 0 && tally[id] === maxVotes);
  const caught = topVoted.length === 1 && topVoted[0] === liarId;

  const scoreChanges = {};
  room.players.forEach((p) => (scoreChanges[p.id] = 0));

  if (caught) {
    room.players.forEach((p) => {
      if (p.id !== liarId) {
        p.score += 1;
        scoreChanges[p.id] = 1;
      }
    });
  } else {
    const liarPlayer = room.players.find((p) => p.id === liarId);
    if (liarPlayer) {
      liarPlayer.score += 1;
      scoreChanges[liarId] = 1;
    }
  }

  const liarPlayer = room.players.find((p) => p.id === liarId);

  io.to(room.code).emit('roundResults', {
    liarId,
    liarName: liarPlayer ? liarPlayer.name : '?',
    caught,
    votes: room.players
      .filter((p) => room.votes[p.id])
      .map((p) => ({ voterName: p.name, votedForId: room.votes[p.id] })),
    tally,
    scoreChanges,
    scoreboard: sortedScoreboard(room),
    isLastRound: room.currentRound >= room.rounds,
  });

  broadcastRoomUpdate(room.code);
}

function sortedScoreboard(room) {
  return room.players
    .map((p) => ({ id: p.id, name: p.name, score: p.score }))
    .sort((a, b) => b.score - a.score);
}

// ---------- socket handlers ----------

io.on('connection', (socket) => {
  socket.on('createRoom', ({ name, rounds } = {}) => {
    const code = generateCode();
    const roundsNum = Math.min(Math.max(parseInt(rounds, 10) || 10, 1), 50);

    rooms[code] = {
      code,
      hostId: socket.id,
      players: [{ id: socket.id, name: sanitizeName(name, 'Host'), score: 0, connected: true }],
      rounds: roundsNum,
      currentRound: 0,
      state: 'lobby',
      questionPool: shuffledIndices(questions.length),
      currentQuestion: null,
      answers: {},
      votes: {},
      prevLiarId: null,
    };

    socket.join(code);
    socket.data.code = code;
    socket.emit('roomCreated', { code });
    broadcastRoomUpdate(code);
  });

  socket.on('joinRoom', ({ code, name } = {}) => {
    const roomCode = (code || '').toString().trim().toUpperCase();
    const room = rooms[roomCode];

    if (!room) return socket.emit('errorMsg', 'Nie znaleziono pokoju o podanym kodzie.');
    if (room.state !== 'lobby') return socket.emit('errorMsg', 'Gra w tym pokoju juz sie rozpoczela.');
    if (room.players.length >= MAX_PLAYERS) return socket.emit('errorMsg', 'Pokoj jest pelny.');

    const finalName = uniqueName(room, sanitizeName(name, 'Gracz'));
    room.players.push({ id: socket.id, name: finalName, score: 0, connected: true });

    socket.join(roomCode);
    socket.data.code = roomCode;
    socket.emit('joinedRoom', { code: roomCode, name: finalName });
    broadcastRoomUpdate(roomCode);
  });

  socket.on('startGame', () => {
    const room = rooms[socket.data.code];
    if (!room || room.hostId !== socket.id || room.state !== 'lobby') return;
    if (connectedPlayers(room).length < MIN_PLAYERS) {
      return socket.emit('errorMsg', `Potrzeba minimum ${MIN_PLAYERS} graczy.`);
    }
    startRound(room);
  });

  socket.on('submitAnswer', ({ answer } = {}) => {
    const room = rooms[socket.data.code];
    if (!room || room.state !== 'answering' || room.answers[socket.id]) return;

    const clean = (answer || '').toString().trim().slice(0, 200);
    if (!clean) return;

    room.answers[socket.id] = clean;
    const total = connectedPlayers(room).length;
    const count = Object.keys(room.answers).length;
    io.to(room.code).emit('answerCount', { count, total });

    if (count >= total) revealAnswers(room);
  });

  socket.on('forceReveal', () => {
    const room = rooms[socket.data.code];
    if (!room || room.hostId !== socket.id || room.state !== 'answering') return;
    revealAnswers(room);
  });

  socket.on('startVoting', () => {
    const room = rooms[socket.data.code];
    if (!room || room.hostId !== socket.id || room.state !== 'reveal') return;
    startVoting(room);
  });

  socket.on('submitVote', ({ votedFor } = {}) => {
    const room = rooms[socket.data.code];
    if (!room || room.state !== 'voting' || room.votes[socket.id]) return;
    if (votedFor === socket.id) return;
    if (!room.players.some((p) => p.id === votedFor)) return;

    room.votes[socket.id] = votedFor;
    const total = connectedPlayers(room).length;
    const count = Object.keys(room.votes).length;
    io.to(room.code).emit('voteCount', { count, total });

    if (count >= total) finishVoting(room);
  });

  socket.on('forceFinishVoting', () => {
    const room = rooms[socket.data.code];
    if (!room || room.hostId !== socket.id || room.state !== 'voting') return;
    finishVoting(room);
  });

  socket.on('nextRound', () => {
    const room = rooms[socket.data.code];
    if (!room || room.hostId !== socket.id || room.state !== 'results') return;

    if (room.currentRound >= room.rounds) {
      room.state = 'ended';
      io.to(room.code).emit('gameOver', { scoreboard: sortedScoreboard(room) });
      broadcastRoomUpdate(room.code);
      return;
    }
    startRound(room);
  });

  socket.on('disconnect', () => {
    const code = socket.data.code;
    const room = rooms[code];
    if (!room) return;

    const player = room.players.find((p) => p.id === socket.id);
    if (player) player.connected = false;

    if (room.hostId === socket.id) {
      const nextHost = room.players.find((p) => p.connected);
      if (nextHost) room.hostId = nextHost.id;
    }

    // If everyone left mid-round, resolve pending answer/vote counts so the
    // game doesn't stall waiting on a player who is gone.
    if (room.state === 'answering') {
      const total = connectedPlayers(room).length;
      if (total > 0 && Object.keys(room.answers).length >= total) revealAnswers(room);
    } else if (room.state === 'voting') {
      const total = connectedPlayers(room).length;
      if (total > 0 && Object.keys(room.votes).length >= total) finishVoting(room);
    }

    broadcastRoomUpdate(code);
    scheduleCleanup(code);
  });
});

server.listen(PORT, () => {
  console.log(`Guess the Liar dziala na porcie ${PORT}`);
});
