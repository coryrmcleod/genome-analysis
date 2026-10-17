// Decimal/scientific coefficients only. Never silently coerce another numeric
// notation, an empty field, overflow or a nonzero value that underflows to zero.
export function parsePGSDecimal(text){
 if(typeof text!=='string')throw Error('Invalid decimal score value');
 const source=text.trim();
 if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(source))throw Error('Invalid decimal score value');
 const value=Number(source),mantissa=source.split(/[eE]/)[0];
 if(!Number.isFinite(value)||value===0&&/[1-9]/.test(mantissa))throw Error('Unrepresentable decimal score value');
 return value;
}
// The full diploid dosage span must be representable without changing weights.
export function validatePGSNumericEnvelope(terms){
 let span=0;
 for(const term of terms){if(!Number.isFinite(term?.weight))throw Error('Invalid model coefficient');span+=2*Math.abs(term.weight);if(!Number.isFinite(span))throw Error('Unsupported score numeric range: full diploid dosage span is not finite.');}
 return span;
}
export function finitePGSMidpoint(lower,upper){
 if(!Number.isFinite(lower)||!Number.isFinite(upper))throw Error('Invalid finite score midpoint endpoints');
 const sum=lower+upper;
 // Preserve ordinary arithmetic and subnormal values; halve first only when
 // same-sign endpoint addition would overflow.
 return Number.isFinite(sum)?sum/2:lower/2+upper/2;
}
