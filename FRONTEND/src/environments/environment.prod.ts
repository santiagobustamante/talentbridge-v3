export const environment = {
  production: true,
  // Backend desplegado en Render (se migró desde Railway por 502s persistentes
  // a nivel de cuenta, ver docs/DECISIONS.md). Los 10 servicios son públicos
  // porque el plan free de Render no soporta servicios privados (pserv).
  // apiUrl: api-gateway -- el resto de servicios de negocio le hablan a través
  // suyo, salvo los dos de abajo que el frontend llama directo.
  // wsUrl: chat-service tiene que tener su PROPIO dominio público -- el chat va
  // por WebSocket directo desde el navegador (chat-socket.service.ts), no pasa
  // por el proxy fetch() del gateway, así que no puede quedar solo en red interna
  // como los demás.
  apiUrl: 'https://api-gateway-ey6d.onrender.com/api',
  wsUrl: 'https://chat-service-olzl.onrender.com',
  // portfolio-service también necesita dominio público propio: la subida de CV
  // (cv.service.ts) le pega directo, bypasea el gateway.
  cvUploadUrl: 'https://portfolio-service-uqi0.onrender.com',
};
