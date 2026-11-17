/**
 * Extrae y normaliza el número de cédula desde:
 * - Digitación manual ("66.771.728")
 * - Código de barras 1D ("0066771728")
 * - Trama 2D PDF417 del reverso de cédula colombiana (contiene PubDSK / bytes nulos y documento incrustado)
 */
export function parseScannerOrSearchInput(rawInput: string): string {
  const trimmed = rawInput.trim();
  if (!trimmed) return '';

  // Detección heurística de trama PDF417 colombiana (larga y con separadores no imprimibles o bloques alfabéticos)
  if (trimmed.length > 30 && /PubDSK|[\u0000-\u001F]/.test(trimmed)) {
    // En la cédula colombiana PDF417, el número de cédula (8-10 dígitos) suele aparecer justo antes del primer apellido
    const matchAfterHeader = /(?:PubDSK[^\d]{0,30}|\u0000+)0*(\d{6,11})(?=[A-Z]{2,})/.exec(
      trimmed,
    );
    if (matchAfterHeader?.[1]) {
      return matchAfterHeader[1].replace(/^0+(?=\d)/, '');
    }

    const numericTokens = trimmed.match(/\d{6,12}/g);
    if (numericTokens && numericTokens.length > 0) {
      const candidate = numericTokens.find((t) => !t.startsWith('19') && !t.startsWith('20')) ?? numericTokens[0]!;
      return candidate.replace(/^0+(?=\d)/, '');
    }
  }

  // Si contiene solo dígitos y separadores de miles/espacios
  if (/^[0-9.\s-]+$/.test(trimmed)) {
    return trimmed.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '');
  }

  return trimmed;
}

