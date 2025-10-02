/**
 * HMAC Verification for Keap Webhooks
 * 
 * Provides secure webhook signature validation using crypto.subtle
 * to prevent webhook spoofing and ensure data integrity.
 */

/**
 * Verify Keap webhook signature using HMAC-SHA256
 * 
 * @param request - The webhook request
 * @param webhookSecret - The webhook secret configured in Keap
 * @returns Promise<boolean> - True if signature is valid
 */
export async function verifyKeapWebhook(request: Request, webhookSecret: string): Promise<boolean> {
  const signature = request.headers.get('X-Hook-Signature');
  if (!signature) {
    console.warn('Missing X-Hook-Signature header');
    return false;
  }
  
  try {
    // Clone the request to read the body without consuming it
    const clonedRequest = request.clone();
    const body = await clonedRequest.text();
    
    // Encode the secret and body for HMAC
    const encoder = new TextEncoder();
    const keyData = encoder.encode(webhookSecret);
    const messageData = encoder.encode(body);
    
    // Import the key for HMAC verification
    const key = await crypto.subtle.importKey(
      'raw', 
      keyData, 
      { name: 'HMAC', hash: 'SHA-256' }, 
      false, 
      ['sign']
    );
    
    // Generate the expected signature
    const expectedSignature = await crypto.subtle.sign('HMAC', key, messageData);
    const expectedSignatureArray = new Uint8Array(expectedSignature);
    
    // Convert the provided signature from base64
    const providedSignatureArray = Uint8Array.from(
      atob(signature), 
      c => c.charCodeAt(0)
    );
    
    // Use timing-safe comparison to prevent timing attacks
    return await timingSafeEqual(expectedSignatureArray, providedSignatureArray);
  } catch (error) {
    console.error('HMAC verification error:', error);
    return false;
  }
}

/**
 * Timing-safe comparison to prevent timing attacks
 * 
 * @param a - First array to compare
 * @param b - Second array to compare
 * @returns Promise<boolean> - True if arrays are equal
 */
async function timingSafeEqual(a: Uint8Array, b: Uint8Array): Promise<boolean> {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  
  return result === 0;
}