(() => {
  const socket = io();

  let state = {
    code: null,
    hostId: null,
    players: [],
    myVote: null,
    myAnswerSent: false,
  };

  // ---------- dom helpers ----------

  const $ = (id) => document.getElementById(id);

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    $(id).classList.add('active');
  }

  function showError(msg) {
    const box = $('errorBox');
    box.textContent = msg;
    box.classList.add('show');
    clearTimeout(showError._t);
    showError._t = setTimeout(() => box.classList.remove('show'), 4000);
  }

  function isHost() {
    return state.hostId === socket.id;
  }

  // ---------- home screen ----------

  $('btnCreateRoom').addEventListener('click', () => {
    const name = $('hostName').value;
    const rounds = $('hostRounds').value;
    socket.emit('createRoom', { name, rounds });
  });

  $('btnJoinRoom').addEventListener('click', () => {
    const name = $('joinName').value;
    const code = $('joinCode').value;
    if (!code.trim()) return showError('Podaj kod pokoju.');
    socket.emit('joinRoom', { name, code });
  });

  $('joinCode').addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
  });

  // ---------- lobby screen ----------

  $('btnStartGame').addEventListener('click', () => socket.emit('startGame'));

  function renderLobby() {
    $('lobbyCode').textContent = state.code;
    $('lobbyRoundsHint').textContent = `Liczba rund: ${state.rounds}`;
    renderRoster('lobbyRoster', true);

    const amHost = isHost();
    $('btnStartGame').style.display = amHost ? 'block' : 'none';
    $('lobbyWaitHint').style.display = amHost ? 'none' : 'block';
    if (amHost && connectedCount() < 3) {
      $('btnStartGame').disabled = true;
      $('btnStartGame').textContent = `Potrzeba minimum 3 graczy (${connectedCount()}/3)`;
    } else if (amHost) {
      $('btnStartGame').disabled = false;
      $('btnStartGame').textContent = 'Rozpocznij grę';
    }
  }

  function connectedCount() {
    return state.players.filter((p) => p.connected).length;
  }

  function renderRoster(elId, withScore) {
    const ul = $(elId);
    ul.innerHTML = '';
    state.players.forEach((p, i) => {
      const li = document.createElement('li');
      if (!p.connected) li.classList.add('offline');
      const isMe = p.id === socket.id;
      li.innerHTML = `
        <span class="num">${String(i + 1).padStart(2, '0')}</span>
        <span class="pname">${escapeHtml(p.name)}${isMe ? ' (Ty)' : ''}</span>
        ${p.id === state.hostId ? '<span class="badge host">Host</span>' : ''}
        ${!p.connected ? '<span class="badge">Offline</span>' : ''}
        ${withScore ? `<span class="score">${p.score}</span>` : ''}
      `;
      ul.appendChild(li);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------- answering screen ----------

  $('btnSubmitAnswer').addEventListener('click', submitAnswer);
  $('answerInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submitAnswer();
  });

  function submitAnswer() {
    const val = $('answerInput').value.trim();
    if (!val) return;
    socket.emit('submitAnswer', { answer: val });
    state.myAnswerSent = true;
    $('answerFormWrap').style.display = 'none';
    $('answerSentMsg').style.display = 'block';
  }

  $('btnForceReveal').addEventListener('click', () => socket.emit('forceReveal'));

  // ---------- reveal screen ----------

  $('btnStartVoting').addEventListener('click', () => socket.emit('startVoting'));

  // ---------- voting screen ----------

  $('btnForceFinishVoting').addEventListener('click', () => socket.emit('forceFinishVoting'));

  function castVote(targetId) {
    if (state.myVote) return;
    if (targetId === socket.id) return;
    socket.emit('submitVote', { votedFor: targetId });
    state.myVote = targetId;
    renderLineupPicked();
  }

  function renderLineupPicked() {
    document.querySelectorAll('#lineup .suspect').forEach((el) => {
      const id = el.dataset.id;
      el.classList.toggle('picked', id === state.myVote);
      if (state.myVote) el.classList.add('disabled');
    });
  }

  // ---------- results screen ----------

  $('btnNextRound').addEventListener('click', () => socket.emit('nextRound'));

  // ---------- end screen ----------

  $('btnNewGame').addEventListener('click', () => window.location.reload());

  // ---------- socket events ----------

  socket.on('roomCreated', ({ code }) => {
    state.code = code;
  });

  socket.on('joinedRoom', ({ code }) => {
    state.code = code;
  });

  socket.on('errorMsg', (msg) => showError(msg));

  socket.on('roomUpdate', (data) => {
    state.code = data.code;
    state.hostId = data.hostId;
    state.players = data.players;
    state.rounds = data.rounds;
    state.currentRound = data.currentRound;

    if (data.state === 'lobby') {
      showScreen('screen-lobby');
      renderLobby();
    }
  });

  socket.on('newRound', ({ roundNumber, totalRounds, question }) => {
    state.myAnswerSent = false;
    state.myVote = null;
    $('roundLabel').textContent = `RUNDA ${roundNumber} / ${totalRounds}`;
    $('questionText').textContent = question;
    $('answerInput').value = '';
    $('answerFormWrap').style.display = 'block';
    $('answerSentMsg').style.display = 'none';
    $('answerStatus').textContent = `Odpowiedziało: 0/${connectedCount()}`;
    $('btnForceReveal').style.display = isHost() ? 'block' : 'none';
    showScreen('screen-answering');
  });

  socket.on('answerCount', ({ count, total }) => {
    $('answerStatus').textContent = `Odpowiedziało: ${count}/${total}`;
  });

  socket.on('answersReveal', ({ realQuestion, answers }) => {
    $('revealQuestion').textContent = realQuestion;
    const ul = $('revealAnswers');
    ul.innerHTML = '';
    answers.forEach((a) => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="a-name">${escapeHtml(a.name)}</span>${escapeHtml(a.answer)}`;
      ul.appendChild(li);
    });
    $('btnStartVoting').style.display = isHost() ? 'block' : 'none';
    $('revealWaitHint').style.display = isHost() ? 'none' : 'block';
    showScreen('screen-reveal');
  });

  socket.on('votingStart', ({ players }) => {
    state.myVote = null;
    const lineup = $('lineup');
    lineup.innerHTML = '';
    players.forEach((p, i) => {
      const div = document.createElement('div');
      div.className = 'suspect';
      div.dataset.id = p.id;
      const isMe = p.id === socket.id;
      if (isMe) div.classList.add('disabled');
      div.innerHTML = `
        <span class="tagnum">PODEJRZANY ${String(i + 1).padStart(2, '0')}</span>
        <span class="sname">${escapeHtml(p.name)}${isMe ? ' (Ty)' : ''}</span>
      `;
      if (!isMe) div.addEventListener('click', () => castVote(p.id));
      lineup.appendChild(div);
    });
    $('voteStatus').textContent = `Zagłosowało: 0/${connectedCount()}`;
    $('btnForceFinishVoting').style.display = isHost() ? 'block' : 'none';
    showScreen('screen-voting');
  });

  socket.on('voteCount', ({ count, total }) => {
    $('voteStatus').textContent = `Zagłosowało: ${count}/${total}`;
  });

  socket.on('roundResults', (data) => {
    const verdict = $('verdictBlock');
    verdict.innerHTML = `
      <span class="stamp ${data.caught ? 'caught' : 'escaped'}">${data.caught ? 'ZŁAPANY' : 'UCIEKŁ'}</span>
      <div class="who">Kłamcą był/a: <b>${escapeHtml(data.liarName)}</b></div>
    `;

    const winners = Object.entries(data.scoreChanges)
      .filter(([, v]) => v > 0)
      .map(([id]) => data.scoreboard.find((p) => p.id === id))
      .filter(Boolean)
      .map((p) => p.name);

    $('scoreChangesLine').textContent = winners.length
      ? `+1 punkt: ${winners.join(', ')}`
      : '';

    const ul = $('roundScoreboard');
    ul.innerHTML = '';
    data.scoreboard.forEach((p, i) => {
      const li = document.createElement('li');
      if (i === 0 && p.score > 0) li.classList.add('leader');
      li.innerHTML = `
        <span class="rank">${i + 1}</span>
        <span class="pname">${escapeHtml(p.name)}</span>
        <span class="pscore">${p.score}</span>
      `;
      ul.appendChild(li);
    });

    const btn = $('btnNextRound');
    btn.textContent = data.isLastRound ? 'Zobacz wyniki końcowe' : 'Następna runda';
    btn.style.display = isHost() ? 'block' : 'none';
    $('resultsWaitHint').style.display = isHost() ? 'none' : 'block';

    showScreen('screen-results');
  });

  socket.on('gameOver', ({ scoreboard }) => {
    const winner = scoreboard[0];
    $('winnerName').textContent = winner ? winner.name : '-';

    const ul = $('finalScoreboard');
    ul.innerHTML = '';
    scoreboard.forEach((p, i) => {
      const li = document.createElement('li');
      if (i === 0) li.classList.add('leader');
      li.innerHTML = `
        <span class="rank">${i + 1}</span>
        <span class="pname">${escapeHtml(p.name)}</span>
        <span class="pscore">${p.score}</span>
      `;
      ul.appendChild(li);
    });

    showScreen('screen-end');
  });

  socket.on('disconnect', () => {
    showError('Utracono połączenie z serwerem. Odśwież stronę.');
  });
})();
