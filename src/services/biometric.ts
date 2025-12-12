import { supabase } from "../supabaseClient";

export class BiometricService {
  private static readonly RP_NAME = "Hushkey Vault";
  private static readonly RP_ID =
    window.location.hostname === "localhost"
      ? "localhost"
      : window.location.hostname;

  static async isAvailable(): Promise<boolean> {
    try {
      if (!window.PublicKeyCredential || !navigator.credentials) {
        return false;
      }
      // Check if platform authenticator is available
      const available =
        await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return available;
    } catch (error) {
      console.error("Error checking biometric availability:", error);
      return false;
    }
  }

  static async register(userId: string): Promise<void> {
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));

      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: this.RP_NAME, id: this.RP_ID },
          user: {
            id: new TextEncoder().encode(userId),
            name: userId,
            displayName: userId,
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" }, // ES256
            { alg: -257, type: "public-key" }, // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            requireResidentKey: false,
          },
          timeout: 60000,
          attestation: "none",
        },
      })) as PublicKeyCredential;

      if (!credential)
        throw new Error("Biometric registration was cancelled or failed");

      const { error } = await supabase.from("biometric_credentials").upsert({
        user_id: userId,
        credential_id: btoa(
          String.fromCharCode(...new Uint8Array(credential.rawId))
        ),
        public_key: btoa(
          String.fromCharCode(
            ...new Uint8Array((credential.response as any).getPublicKey())
          )
        ),
      });

      if (error)
        throw new Error(
          "Failed to save biometric credential: " + error.message
        );
    } catch (error: any) {
      console.error("Biometric registration error:", error);
      if (error.name === "NotAllowedError") {
        throw new Error(
          "Biometric authentication was cancelled or permission denied"
        );
      } else if (error.name === "NotSupportedError") {
        throw new Error(
          "Biometric authentication is not supported on this device"
        );
      } else if (error.name === "InvalidStateError") {
        throw new Error(
          "Biometric credential already exists. Please remove it first."
        );
      } else {
        throw new Error(
          error.message || "Failed to setup biometric authentication"
        );
      }
    }
  }

  static async authenticate(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from("biometric_credentials")
        .select("credential_id")
        .eq("user_id", userId)
        .single();

      if (error || !data)
        throw new Error(
          "No biometric credential found. Please setup biometric authentication first."
        );

      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const credentialId = Uint8Array.from(atob(data.credential_id), (c) =>
        c.charCodeAt(0)
      );

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: this.RP_ID,
          allowCredentials: [{ id: credentialId, type: "public-key" }],
          userVerification: "required",
          timeout: 60000,
        },
      });

      return !!assertion;
    } catch (error: any) {
      console.error("Biometric authentication error:", error);
      if (error.name === "NotAllowedError") {
        throw new Error("Biometric authentication was cancelled");
      } else if (error.name === "NotSupportedError") {
        throw new Error("Biometric authentication is not supported");
      } else {
        throw new Error(error.message || "Biometric authentication failed");
      }
    }
  }
}
