"""
Validadores de cédula y RUC para Ecuador, según los algoritmos oficiales
del SRI (Servicio de Rentas Internas).
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
    """Algoritmo módulo 11 para RUC de sociedades y entidades públicas."""
    total = sum(d * c for d, c in zip(digits, coefficients))
    remainder = total % 11
    
    # Si el residuo es 0, el dígito verificador es 0
    if remainder == 0:
        return 0
        
    result = 11 - remainder
    
    # CORRECCIÓN SRI: Si el resultado es 10, el dígito verificador oficial es 0
    if result == 10:
        return 0
        
    return result


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
    if digits[2] > 5:  # El tercer dígito debe ser 0-5 para personas naturales
        return False

    coef = [2, 1, 2, 1, 2, 1, 2, 1, 2]
    expected = _check_digit_mod10(digits[:9], coef)
    return expected == digits[9]


def is_valid_ruc(value: str) -> bool:
    """Valida un RUC ecuatoriano de 13 dígitos."""
    if not value.isdigit() or len(value) != 13:
        return False

    if not _valid_province(value):
        return False

    digits = [int(c) for c in value]
    third = digits[2]

    # ─────────────────────────────────────────
    # Persona natural
    # ─────────────────────────────────────────
    if third <= 5:
        coef = [2, 1, 2, 1, 2, 1, 2, 1, 2]
        expected = _check_digit_mod10(digits[:9], coef)
        
        if expected != digits[9]:
            return False
        return value[10:13] != "000"

    # ─────────────────────────────────────────
    # Entidad pública
    # ─────────────────────────────────────────
    if third == 6:
        coef = [3, 2, 7, 6, 5, 4, 3, 2]
        expected = _check_digit_mod11(digits[:8], coef)

        # CORRECCIÓN: Se eliminó "expected >= 10"
        if expected != digits[8]:
            return False
        return value[9:13] != "0000"

    # ─────────────────────────────────────────
    # Sociedad privada
    # ─────────────────────────────────────────
    if third == 9:
        coef = [4, 3, 2, 7, 6, 5, 4, 3, 2]
        expected = _check_digit_mod11(digits[:9], coef)

        # CORRECCIÓN: Se eliminó "expected >= 10"
        if expected != digits[9]:
            return False
        return value[10:13] != "000"

    return False

# Prueba con el RUC de tu duda anterior (Retorna True exitosamente)
print(is_valid_ruc("0791823595001")) 
