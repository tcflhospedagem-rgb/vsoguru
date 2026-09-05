import { ADMIN_ROLE_IDS, POSICAO_NORMALIZE, POSICAO_FULL, POSICAO_EMOJI } from '../config.js';
export { POSICAO_NORMALIZE, POSICAO_FULL, POSICAO_EMOJI };

export function normalizarPosicao(pos) {
  if (!pos) return 'MEI';
  const posUpper = String(pos).toUpperCase().trim();
  return POSICAO_NORMALIZE[posUpper] || 'MEI';
}

export function isAdmin(member) {
  if (!member || !member.roles) return false;
  if (ADMIN_ROLE_IDS.length === 0) {
    console.warn('⚠️ [isAdmin] ADMIN_ROLE_IDS está vazio! Defina o cargo ADM no .env (ADMIN_ROLE_IDS=ID_DO_CARGO)');
    return false;
  }
  if (member.roles.cache) {
    return member.roles.cache.some(r => ADMIN_ROLE_IDS.includes(r.id));
  }
  if (Array.isArray(member.roles)) {
    return member.roles.some(r => ADMIN_ROLE_IDS.includes(r));
  }
  return false;
}

export function fmtReais(valor) {
  const num = Math.floor(Number(valor) || 0);
  return `R$ ${num.toLocaleString('pt-BR')},00`;
}

export function corPorOverall(overall) {
  const ovr = Number(overall) || 50;
  if (ovr >= 95) return 0xff4500;
  if (ovr >= 90) return 0xffd700;
  if (ovr >= 85) return 0xb44fea;
  if (ovr >= 80) return 0x1e90ff;
  if (ovr >= 70) return 0x2ecc71;
  return 0x95a5a6;
}

export function medalhaOverall(overall) {
  const ovr = Number(overall) || 50;
  if (ovr >= 99) return '👑 LENDÁRIO';
  if (ovr >= 90) return '🏆 ELITE';
  if (ovr >= 85) return '💎 RARO';
  if (ovr >= 80) return '⭐ BOM';
  if (ovr >= 70) return '🥈 PRATA';
  return '🥉 BRONZE';
}

export function estrelasOverall(overall) {
  const ovr = Number(overall) || 50;
  if (ovr >= 90) return '★★★★★';
  if (ovr >= 80) return '★★★★☆';
  if (ovr >= 70) return '★★★☆☆';
  if (ovr >= 60) return '★★☆☆☆';
  return '★☆☆☆☆';
}

export function calcularPesoRaridade(jogador) {
  const overall = jogador.overall || 50;
  const preco = jogador.preco || 1000;

  let pesoOvr = 25.0;
  if (overall >= 95) pesoOvr = 0.1;
  else if (overall >= 90) pesoOvr = 0.5;
  else if (overall >= 85) pesoOvr = 2.0;
  else if (overall >= 80) pesoOvr = 5.0;
  else if (overall >= 75) pesoOvr = 10.0;
  else if (overall >= 70) pesoOvr = 15.0;

  let pesoPreco = 15.0;
  if (preco >= 50000000) pesoPreco = 0.1;
  else if (preco >= 10000000) pesoPreco = 0.3;
  else if (preco >= 5000000) pesoPreco = 0.8;
  else if (preco >= 2000000) pesoPreco = 2.0;
  else if (preco >= 1000000) pesoPreco = 4.0;
  else if (preco >= 500000) pesoPreco = 8.0;

  return (pesoOvr * 0.7) + (pesoPreco * 0.3);
}

export function sortearJogadorPonderado(jogadores) {
  if (!jogadores || jogadores.length === 0) return null;
  const pesos = jogadores.map(calcularPesoRaridade);
  const somaPesos = pesos.reduce((a, b) => a + b, 0);
  let randomVal = Math.random() * somaPesos;

  for (let i = 0; i < jogadores.length; i++) {
    if (randomVal < pesos[i]) {
      return jogadores[i];
    }
    randomVal -= pesos[i];
  }
  return jogadores[jogadores.length - 1];
}

export function calcularRaridade(jogador) {
  const peso = calcularPesoRaridade(jogador);
  const overall = jogador.overall || 50;
  if (overall >= 95 || peso <= 0.5) return '🔴 LENDÁRIO';
  if (overall >= 90 || peso <= 1.5) return '🟠 ÉPICO';
  if (overall >= 85 || peso <= 4.0) return '🟣 RARO';
  if (overall >= 80 || peso <= 8.0) return '🔵 INCOMUM';
  return '🟢 COMUM';
}

export function calcularChancePercentual(jogador, todosJogadores) {
  if (!todosJogadores || todosJogadores.length === 0) return 0.0;
  const pesos = todosJogadores.map(calcularPesoRaridade);
  const pesoJogador = calcularPesoRaridade(jogador);
  const somaPesos = pesos.reduce((a, b) => a + b, 0);
  if (somaPesos === 0) return 0.0;
  return Number(((pesoJogador / somaPesos) * 100).toFixed(2));
}

export function getCooldown(membroDados, campo) {
  const valor = membroDados[campo];
  if (!valor) return null;
  const dt = new Date(valor);
  return isNaN(dt.getTime()) ? null : dt;
}

export function setCooldown(membroDados, campo, data) {
  membroDados[campo] = data.toISOString();
}

export function clearCooldown(membroDados, campo) {
  membroDados[campo] = null;
}
