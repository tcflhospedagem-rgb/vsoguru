export function simularPartida(time1Titulares, time2Titulares, time1Nome, time2Nome) {
  if (!time1Titulares || time1Titulares.length === 0 || !time2Titulares || time2Titulares.length === 0) {
    return null;
  }

  const ovr1 = time1Titulares.reduce((s, j) => s + j.overall, 0) / time1Titulares.length;
  const ovr2 = time2Titulares.reduce((s, j) => s + j.overall, 0) / time2Titulares.length;

  function calcularSetores(titulares) {
    const ovrTime = titulares.reduce((s, j) => s + j.overall, 0) / titulares.length;
    const atacantes = titulares.filter(j => j.posicao === 'ATA');
    const meias = titulares.filter(j => ['MEI', 'VOL'].includes(j.posicao));
    const defensores = titulares.filter(j => ['GOL', 'ZAG', 'LD', 'LE'].includes(j.posicao));

    const ataque = atacantes.length > 0 ? atacantes.reduce((s, j) => s + j.overall, 0) / atacantes.length : ovrTime;
    const meio = meias.length > 0 ? meias.reduce((s, j) => s + j.overall, 0) / meias.length : ovrTime;
    const defesa = defensores.length > 0 ? defensores.reduce((s, j) => s + j.overall, 0) / defensores.length : ovrTime;

    return { ataque, meio, defesa };
  }

  const set1 = calcularSetores(time1Titulares);
  const set2 = calcularSetores(time2Titulares);

  function calcularGols(ataque, defesaAdv, ovrTime) {
    const base = defesaAdv > 0 ? (ataque / defesaAdv) : 1;
    const rand = 0.5 + Math.random();
    const chance = base * (ovrTime / 100) * rand;
    const maxGols = Math.floor(Math.random() * 5);
    const gols = Math.floor(chance * maxGols);
    return Math.max(0, Math.min(gols, 7));
  }

  const gols1 = calcularGols(set1.ataque, set2.defesa, ovr1);
  const gols2 = calcularGols(set2.ataque, set1.defesa, ovr2);

  const eventos = [];
  const atacantes1 = time1Titulares.filter(j => ['ATA', 'MEI'].includes(j.posicao));
  const poolAtk1 = atacantes1.length > 0 ? atacantes1 : time1Titulares;

  for (let i = 0; i < gols1; i++) {
    const artilheiro = poolAtk1[Math.floor(Math.random() * poolAtk1.length)];
    eventos.push({
      minuto: Math.floor(Math.random() * 90) + 1,
      time: time1Nome,
      jogador: artilheiro.nome,
      tipo: 'gol'
    });
  }

  const atacantes2 = time2Titulares.filter(j => ['ATA', 'MEI'].includes(j.posicao));
  const poolAtk2 = atacantes2.length > 0 ? atacantes2 : time2Titulares;

  for (let i = 0; i < gols2; i++) {
    const artilheiro = poolAtk2[Math.floor(Math.random() * poolAtk2.length)];
    eventos.push({
      minuto: Math.floor(Math.random() * 90) + 1,
      time: time2Nome,
      jogador: artilheiro.nome,
      tipo: 'gol'
    });
  }

  eventos.sort((a, b) => a.minuto - b.minuto);

  let vencedor = null;
  if (gols1 > gols2) vencedor = time1Nome;
  else if (gols2 > gols1) vencedor = time2Nome;

  return {
    time1: time1Nome,
    time2: time2Nome,
    gols1,
    gols2,
    ovr1: Number(ovr1.toFixed(1)),
    ovr2: Number(ovr2.toFixed(1)),
    vencedor,
    eventos
  };
}
