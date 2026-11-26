// Google AdSense settings for Albushra Literature.
// While `client` is null no ad code is loaded and no empty ad boxes are shown.
// The owner fills these from AdSense (adsense.google.com):
//   client   → Account → Account information → Publisher ID, written as "ca-pub-XXXXXXXXXXXXXXXX"
//   homeSlot → Ads → By ad unit → Display ads → create "Literature home" → copy data-ad-slot (digits only)
// Ads appear only on the home page: never in the reader, quizzes or the Shorts feed.
export const ADSENSE = {
  client: "ca-pub-9020986096955143", // same publisher as albushra.app (see https://albushra.app/ads.txt)
  homeSlot: null,
};
