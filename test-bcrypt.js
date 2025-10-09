const bcrypt = require('bcryptjs');

const password = 'ProvaSuper123!'; // la password che vuoi testare
const hash = '$2b$10$SOwj/TM3VvZf4eFb7uOvKeMuG/h/eDR3VwH/UEfi3BlmS5VFe.6h.'; // l'hash da testare

bcrypt.compare(password, hash, (err, res) => {
  if (err) throw err;
  console.log('Result:', res); // true se corrisponde, false se NO
});