# Restaurant Matrix

This project visualizes restaurants (or other places) on a matrix of average rating versus total number of reviews. It allows filtering by name, price range, whether a place is currently open, and by a primary type. Data is sourced from the [Google Places API](https://developers.google.com/maps/documentation/places) via a small serverless proxy located at `src/app/api/places/route.ts`.

## Development

To run the project locally:

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```

Then open <http://localhost:3000> in your browser. Ensure you set `GOOGLE_PLACES_API_KEY` in your environment (e.g. in `.env.local`) to a valid API key with access to the **Places API (New)**.

## Deployment

Deploy to Vercel (or another provider) as a Next.js app. Set the `GOOGLE_PLACES_API_KEY` environment variable in the deployment platform. For cost savings, the API route caches results in memory for 12 hours; consider adding a more persistent cache (e.g. Redis or Vercel KV) for production use.