"""
Validadores de cédula y RUC para Ecuador, según los algoritmos oficiales
del SRI (Servicio de Rentas Internas).

Tipos de RUC según el tercer dígito:
- 0-5: Persona natural        -> cédula (mod 10) + establecimiento "001".."999"
- 6:   Entidad pública         -> mod 11 (8 dígitos) + establecimiento "0001".."9999"
- 9:   Sociedad privada/jurídica -> mod 11 (9 dígitos) + establecimiento "001".."999"

Los dos primeros dígitos corresponden al código de provincia (01-24), o
30 para contribuyentes especiales/no domiciliados.
"""


def _check_digit_mod10(digits: list[int], coefficients: list[int]) -> int:
    """Algoritmo módulo 10, usado para cédulas y RUC de persona natural."""
    total = 0
    for digit, coef in zip(digits, coefficients):
        product = digit * coef
        if product >= 10:
            product -= 9
        total += product
    remainder = total % 10
    return 0 if remainder == 0 else 10 - remainder


def _check_digit_mod11(digits: list[int], coefficients: list[int]) -> int:
    """Algoritmo módulo 11, usado para RUC de sociedades y entidades públicas."""
    total = sum(d * c for d, c in zip(digits, coefficients))
    remainder = total % 11
    return 0 if remainder == 0 else 11 - remainder


def _valid_province(value: str) -> bool:
    province = int(value[:2])
    return (1 <= province <= 24) or province == 30


def is_valid_cedula(value: str) -> bool:
    """Valida una cédula ecuatoriana (10 dígitos)."""
    if not value.isdigit() or len(value) != 10:
        return False
    if not _valid_province(value):
        return False

    digits = [int(c) for c in value]
    if digits[2] > 5:  # el tercer dígito debe ser 0-5 para personas naturales
        return False

    coef = [2, 1, 2, 1, 2, 1, 2, 1, 2]
    expected = _check_digit_mod10(digits[:9], coef)
    return expected == digits[9]


def is_valid_ruc(value: str) -> bool:
    """
    Valida un RUC ecuatoriano (13 dígitos): persona natural, sociedad
    privada o entidad pública.
    """
    if not value.isdigit() or len(value) != 13:
        return False
    if not _valid_province(value):
        return False

    digits = [int(c) for c in value]
    third = digits[2]

    if third <= 5:
        # Persona natural: cédula (10 dígitos) + establecimiento "001".."999"
        coef = [2, 1, 2, 1, 2, 1, 2, 1, 2]
        expected = _check_digit_mod10(digits[:9], coef)
        if expected != digits[9]:
            return False
        return value[10:13] != "000"

    if third == 6:
        # Entidad pública: 8 dígitos + dígito verificador + estab. "0001".."9999"
        coef = [2, 3, 4, 5, 6, 7, 2, 3]
        expected = _check_digit_mod11(digits[:8], coef)
        if expected == 10 or expected != digits[8]:
            return False
        return value[9:13] != "0000"

    if third == 9:
        # Sociedad privada: 9 dígitos + dígito verificador + estab. "001".."999"
        coef = [2, 3, 4, 5, 6, 7, 2, 3, 4]
        expected = _check_digit_mod11(digits[:9], coef)
        if expected == 10 or expected != digits[9]:
            return False
        return value[10:13] != "000"

    return False
