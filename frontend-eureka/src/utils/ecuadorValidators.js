/**
 * Validadores de cédula/RUC ecuatorianos (algoritmos oficiales SRI).
 * Misma lógica que app/core/ecuador_validators.py en el backend, usada
 * aquí solo para feedback instantáneo en el formulario; el backend es
 * la fuente de verdad.
 */

const checkDigitMod10 = (digits, coefficients) => {
  let total = 0;
  digits.forEach((d, i) => {
    let product = d * coefficients[i];
    if (product >= 10) product -= 9;
    total += product;
  });
  const remainder = total % 10;
  return remainder === 0 ? 0 : 10 - remainder;
};

const checkDigitMod11 = (digits, coefficients) => {
  let total = 0;
  digits.forEach((d, i) => {
    total += d * coefficients[i];
  });
  const remainder = total % 11;
  return remainder === 0 ? 0 : 11 - remainder;
};

const validProvince = (value) => {
  const province = parseInt(value.slice(0, 2), 10);
  return (province >= 1 && province <= 24) || province === 30;
};

export const isValidCedula = (value) => {
  if (!/^\d{10}$/.test(value)) return false;
  if (!validProvince(value)) return false;

  const digits = value.split("").map(Number);
  if (digits[2] > 5) return false;

  const coef = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  const expected = checkDigitMod10(digits.slice(0, 9), coef);
  return expected === digits[9];
};

export const isValidRuc = (value) => {
  if (!/^\d{13}$/.test(value)) return false;
  if (!validProvince(value)) return false;

  const digits = value.split("").map(Number);
  const third = digits[2];

  // Persona natural
  if (third <= 5) {
    const coef = [2, 1, 2, 1, 2, 1, 2, 1, 2];

    const expected = checkDigitMod10(
      digits.slice(0, 9),
      coef
    );

    if (expected !== digits[9]) return false;

    return value.slice(10, 13) !== "000";
  }

  // Entidad pública
  if (third === 6) {
    const coef = [2, 3, 4, 5, 6, 7, 2, 3];

    const expected = checkDigitMod11(
      digits.slice(0, 8),
      coef
    );

    if (expected === 10 || expected !== digits[8]) {
      return false;
    }

    return value.slice(9, 13) !== "0000";
  }

  // Sociedad privada
  if (third === 9) {
    return value.slice(10, 13) === "001";
  }

  return false;
};