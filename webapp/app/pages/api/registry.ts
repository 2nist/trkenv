export default function handler(req, res) {
  // Simple registry endpoint for React DevTools
  res.status(200).json({
    message: "Registry endpoint",
    version: "1.0.0"
  });
}