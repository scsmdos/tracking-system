const IS_LIVE = true; // Set to true for production build

const LIVE_URL = 'https://tmssecure.in/api';
const LOCAL_URL = 'http://10.32.136.215:8000/api';

export const API_URL = IS_LIVE ? LIVE_URL : LOCAL_URL;
