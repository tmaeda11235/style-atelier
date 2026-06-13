const net = require('net');
const server = net.createServer();
server.listen(0, () => {
  const port = server.address().port;
  server.close(() => {
    process.stdout.write(String(port));
  });
});
