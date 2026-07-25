export const environment = {
  production: true,
  // Backend desplegado en Railway (proyecto "renewed-enchantment"). El 502
  // persistente a nivel de cuenta que motivó la migración a Render (ver
  // docs/DECISIONS.md) resultó ser dos bugs de configuración -- falta de
  // PORT explícito y rootDirectory/dockerfilePath sin persistir por
  // servicio -- no una falla de la plataforma; corregidos y verificados
  // end-to-end antes de este cambio.
  // apiUrl: api-gateway -- el resto de servicios de negocio le hablan a través
  // suyo (red privada .railway.internal), salvo los dos de abajo que el
  // frontend llama directo.
  // wsUrl: chat-service tiene que tener su PROPIO dominio público -- el chat va
  // por WebSocket directo desde el navegador (chat-socket.service.ts), no pasa
  // por el proxy fetch() del gateway, así que no puede quedar solo en red interna
  // como los demás.
  apiUrl: 'https://api-gateway-production-47f0.up.railway.app/api',
  wsUrl: 'https://chat-service-production-ac0b.up.railway.app',
  // portfolio-service también necesita dominio público propio: la subida de CV
  // (cv.service.ts) le pega directo, bypasea el gateway.
  cvUploadUrl: 'https://portfolio-service-production-4815.up.railway.app',
};
