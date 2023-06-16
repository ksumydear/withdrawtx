const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { encryptFile, decryptFile, getEncryptionKey } = require('./encrypt');

const addressesFile = `${process.env.PWD}/addresses.txt`;
const keypairFilesDir = `${process.env.PWD}/keypair_files`;

async function withdrawVoteAccountRewards() {
  const addresses = fs.readFileSync(addressesFile, 'utf-8').trim().split('\n');
  let secretKey;
  let validKey = false;

  while (!validKey) {
    secretKey = await getEncryptionKey();

    try {
      for (const address of addresses) {
        const withdrawerAccountKeypairFile = path.join(keypairFilesDir, address.split(';')[2] + '.json');
        const withdrawerAccountKeypairEncryptedFile = withdrawerAccountKeypairFile + '.encrypted';

        if (!fs.existsSync(withdrawerAccountKeypairEncryptedFile)) {
          console.log(`Зашифрованный файл для ${withdrawerAccountKeypairFile} не найден.`);
          encryptFile(withdrawerAccountKeypairFile, secretKey);
          console.log(`Зашифрованный файл ${withdrawerAccountKeypairEncryptedFile} успешно создан.`);
        }

        JSON.parse(decryptFile(withdrawerAccountKeypairEncryptedFile, secretKey));
      }
      validKey = true;
    } catch (error) {
      console.error('Ошибка при расшифровке файла: неверный пароль. Пожалуйста, попробуйте еще раз.');
    }
  }

  for (const address of addresses) {
    const [senderAddress, recipientAddress, withdrawerAccountKeypairFile] = address.split(';');
    const withdrawerAccountKeypairFullPath = path.join(keypairFilesDir, withdrawerAccountKeypairFile + '.json');
    const withdrawerAccountKeypairEncryptedFile = withdrawerAccountKeypairFullPath + '.encrypted';

    const decryptedWithdrawerAccountKeypair = decryptFile(withdrawerAccountKeypairEncryptedFile, secretKey);

    const transferAmount = 0.01; // Указываем сумму для отправки (0.01 SOL)



    const transferCommand = `echo '${decryptedWithdrawerAccountKeypair}' | solana transfer --url https://api.mainnet-beta.solana.com ${recipientAddress} ${transferAmount} --keypair -`;

    console.log(`Отправка ${transferAmount} SOL с адреса ${senderAddress} на адрес ${recipientAddress}...`);

exec(transferCommand, (error, stdout, stderr) => {
  if (error) {
    console.error(`Ошибка выполнения отправки ${transferAmount} SOL с адреса ${senderAddress} на адрес ${recipientAddress}:`, error.message);
    return;
  }
  if (stderr) {
    console.error(`Ошибка выполнения отправки ${transferAmount} SOL с адреса ${senderAddress} на адрес ${recipientAddress}:`, stderr);
    return;
  }
  console.log(`Отправлено ${transferAmount} SOL с адреса ${senderAddress} на адрес ${recipientAddress}:`, stdout);
});
