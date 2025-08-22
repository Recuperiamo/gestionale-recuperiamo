// Validazione robusta client-side per il form clienti
export function validateClientiForm(form) {
  const errors = [];

  // Nome referente obbligatorio e almeno 2 caratteri
  if (!form.nome || form.nome.trim().length < 2) {
    errors.push("Il nome referente è obbligatorio (almeno 2 caratteri).");
  }

  // Email: regex robusta, blacklist domini, blocco email troppo semplici
  if (!form.email || form.email.trim().length === 0) {
    errors.push("L'email è obbligatoria.");
  } else {
    const email = form.email.trim();

    // Regex robusta
    const emailRegex = /^[a-zA-Z0-9._%+-]{2,}@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    // Blacklist domini
    const blacklistDomains = [
      "test.com",
      "example.com",
      "asdf.com",
      "a.com",
      "b.com",
      "mail.com",
      "demo.com",
      "placeholder.com",
      "fakemail.com",
      "fake.com"
    ];

    // Pattern troppo semplici: "a@a.com", "test@test.com" ecc.
    const simpleEmails = [
      /^([a-z])@\1\.com$/i, // a@a.com, b@b.com
      /^test@test\.com$/i,
      /^demo@demo\.com$/i,
      /^user@user\.com$/i,
      /^admin@admin\.com$/i
    ];

    const [local, domain] = email.split("@");

    if (!emailRegex.test(email)) {
      errors.push("Inserisci un indirizzo email valido.");
    } else if (domain && blacklistDomains.includes(domain.toLowerCase())) {
      errors.push("Non sono ammessi indirizzi email di test o placeholder.");
    } else if (local.length < 6) {
      errors.push("L'email deve avere almeno 6 caratteri prima della @.");
    } else if (simpleEmails.some((re) => re.test(email))) {
      errors.push("L'email è troppo semplice o sembra un placeholder.");
    }
  }

  // Telefono: solo cifre, opzionale
  if (form.telefono && form.telefono.trim().length > 0) {
    if (!/^[0-9]{6,16}$/.test(form.telefono.trim())) {
      errors.push("Il telefono può contenere solo cifre (6-16 caratteri).");
    }
  }

  // Altri campi opzionali: nessuna validazione aggiuntiva per indirizzo, cf, piva, note

  return errors;
}