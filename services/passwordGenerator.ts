export const generatePassword = (
  length: number,
  options: { uppercase: boolean; numbers: boolean; symbols: boolean }
): string => {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+~`|}{[]:;?><,./-=';

  let charset = lowercase;
  if (options.uppercase) charset += uppercase;
  if (options.numbers) charset += numbers;
  if (options.symbols) charset += symbols;

  let retVal = '';
  // Ensure at least one of each selected type
  if (options.uppercase) retVal += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
  if (options.numbers) retVal += numbers.charAt(Math.floor(Math.random() * numbers.length));
  if (options.symbols) retVal += symbols.charAt(Math.floor(Math.random() * symbols.length));

  for (let i = retVal.length; i < length; i++) {
    retVal += charset.charAt(Math.floor(Math.random() * charset.length));
  }

  // Shuffle
  return retVal.split('').sort(() => 0.5 - Math.random()).join('');
};

export const generateMemorablePassword = (): string => {
  const words = ['correct', 'horse', 'battery', 'staple', 'blue', 'sky', 'mountain', 'river', 'cosmic', 'nebula', 'coffee', 'jazz'];
  const separator = '-';
  let ret = '';
  for (let i = 0; i < 4; i++) {
    ret += words[Math.floor(Math.random() * words.length)];
    if (i < 3) ret += separator;
  }
  return ret;
};

export const generateTOTP = async (secret: string): Promise<string> => {
    if(!secret) return '';
    try {
        // Simple Base32 decode (RFC 4648)
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        let bits = "";
        
        const cleanedSecret = secret.replace(/\s/g, '').toUpperCase();
        
        for (let i = 0; i < cleanedSecret.length; i++) {
            const val = alphabet.indexOf(cleanedSecret[i]);
            if (val === -1) continue;
            bits += val.toString(2).padStart(5, '0');
        }

        const bytes = new Uint8Array(Math.ceil(bits.length / 8));
        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = parseInt(bits.substr(i * 8, 8), 2) || 0;
        }

        const epoch = Math.round(new Date().getTime() / 1000.0);
        const time = Math.floor(epoch / 30); // 30 second step

        const buffer = new ArrayBuffer(8);
        const view = new DataView(buffer);
        view.setUint32(4, time, false); // Big-endian

        const key = await window.crypto.subtle.importKey(
            "raw",
            bytes,
            { name: "HMAC", hash: "SHA-1" },
            false,
            ["sign"]
        );

        const signature = await window.crypto.subtle.sign("HMAC", key, buffer);
        const sigBytes = new Uint8Array(signature);
        
        const offset = sigBytes[sigBytes.length - 1] & 0xf;
        const binary =
            ((sigBytes[offset] & 0x7f) << 24) |
            ((sigBytes[offset + 1] & 0xff) << 16) |
            ((sigBytes[offset + 2] & 0xff) << 8) |
            (sigBytes[offset + 3] & 0xff);
            
        const otp = binary % 1000000;
        return otp.toString().padStart(6, '0');
    } catch (e) {
        console.error("TOTP Error", e);
        return "ERROR";
    }
};