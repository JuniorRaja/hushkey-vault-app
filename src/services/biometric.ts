import { supabase } from '../supabaseClient';

export class BiometricService {
  private static readonly RP_NAME = 'Hushkey Vault';
  private static readonly RP_ID = window.location.hostname;

  static async isAvailable(): Promise<boolean> {
    return !!(window.PublicKeyCredential && navigator.credentials);
  }

  static async register(userId: string): Promise<void> {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: this.RP_NAME, id: this.RP_ID },
        user: {
          id: new TextEncoder().encode(userId),
          name: userId,
          displayName: userId,
        },
        pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
        },
        timeout: 60000,
      },
    }) as PublicKeyCredential;

    if (!credential) throw new Error('Biometric registration failed');

    const { data, error } = await supabase
      .from('biometric_credentials')
      .upsert({
        user_id: userId,
        credential_id: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
        public_key: btoa(String.fromCharCode(...new Uint8Array((credential.response as any).getPublicKey()))),
      });

    if (error) throw error;
  }

  static async authenticate(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('biometric_credentials')
      .select('credential_id')
      .eq('user_id', userId)
      .single();

    if (error || !data) throw new Error('No biometric credential found');

    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const credentialId = Uint8Array.from(atob(data.credential_id), c => c.charCodeAt(0));

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: this.RP_ID,
        allowCredentials: [{ id: credentialId, type: 'public-key' }],
        userVerification: 'required',
        timeout: 60000,
      },
    });

    return !!assertion;
  }
}
