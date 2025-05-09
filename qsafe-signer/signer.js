const { dilithium } = require('dilithium-crystals');
const chalk       = require('chalk');

(async () => {
  await dilithium.ready;
  const { publicKey, privateKey } = await dilithium.keyPair();
  const msg = Buffer.from('test-message');

  const sig = await dilithium.signDetached(msg, privateKey);
  const ok  = await dilithium.verifyDetached(sig, msg, publicKey);

  console.log(chalk.green(`Dilithium sig verified? ${ok}`));
})();
