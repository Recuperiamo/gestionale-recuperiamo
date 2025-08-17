/**
 * Validazione form cliente.
 * Restituisce array di stringhe di errore.
 */
export function validateClientiForm(form) {
  const errs = [];
  if (!form.nome || !form.nome.trim()) errs.push("Nome obbligatorio.");
  if (
    !form.email ||
    !form.email.trim() ||
    !/^[\w-.]+@[\w-]+\.(it|com|net)$/i.test(form.email)
  )
    errs.push("Formato email non valido (sono ammessi solo domini .it, .com, .net).");
  if (
    form.telefono &&
    (!/^\d+$/.test(form.telefono) || /\D/.test(form.telefono))
  )
    errs.push("Il telefono può contenere solo cifre.");
  if (form.cf && !/^[a-zA-Z0-9]{16}$/.test(form.cf))
    errs.push("Codice fiscale non valido (deve essere di 16 caratteri alfanumerici).");
  if (form.piva && !/^\d{11}$/.test(form.piva))
    errs.push("Partita IVA non valida (11 cifre).");
  return errs;
}