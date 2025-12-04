// Note: Browsers cannot detect WiFi SSID/password due to security restrictions
// This would require native app capabilities or system-level permissions

export const generateWifiQR = (ssid: string, password: string, securityType: string = 'WPA2'): string => {
  // WiFi QR format: WIFI:T:WPA;S:ssid;P:password;;
  const security = securityType === 'Open' ? 'nopass' : securityType;
  const qrData = `WIFI:T:${security};S:${ssid};P:${password};;`;
  return qrData;
};
