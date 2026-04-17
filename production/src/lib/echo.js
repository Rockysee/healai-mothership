import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Initialize Pusher for Laravel Reverb
window.Pusher = Pusher;

const echo = new Echo({
  broadcaster: 'pusher',
  key: 'local-reverb-key', // Must match REVERB_APP_KEY in Laravel .env
  cluster: 'mt1',
  wsHost: window.location.hostname,
  wsPort: 8080,
  wssPort: 8080,
  forceTLS: false,
  encrypted: false,
  disableStats: true,
  enabledTransports: ['ws', 'wss'],
});

export default echo;
