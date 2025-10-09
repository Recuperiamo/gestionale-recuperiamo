const bcrypt = require('bcryptjs');

const pwd = 'TestCopilot2025!';

console.log('PASSWORD:', pwd);
const hash = bcrypt.hashSync(pwd, 10);
console.log('GENERATED HASH:', hash);
console.log('HASH LENGTH:', hash.length);
console.log('COMPARE SYNC WITH GENERATED:', bcrypt.compareSync(pwd, hash));
(async () => {
  const cmp = await bcrypt.compare(pwd, hash);
  console.log('COMPARE ASYNC WITH GENERATED:', cmp);
})();