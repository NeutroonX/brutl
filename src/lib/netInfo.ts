import * as Network from 'expo-network';

export async function isConnected(): Promise<boolean> {
  const state = await Network.getNetworkStateAsync();
  return state.isConnected === true && state.isInternetReachable !== false;
}

export async function waitForConnection(timeoutMs = 10_000): Promise<boolean> {
  const online = await isConnected();
  if (online) return true;

  return new Promise((resolve) => {
    const deadline = setTimeout(() => resolve(false), timeoutMs);
    const interval = setInterval(async () => {
      if (await isConnected()) {
        clearInterval(interval);
        clearTimeout(deadline);
        resolve(true);
      }
    }, 2_000);
  });
}
