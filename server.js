const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "10kb" }));

const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;

app.get("/", (req, res) => {
  res.json({
    name: "OGU Checker API",
    status: "online",
    endpoints: {
      health: "GET /api/health",
      roblox: "GET /api/check/roblox/:username"
    }
  });
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/check/roblox/:username", async (req, res) => {
  const username = String(req.params.username || "").trim();

  if (!USERNAME_RE.test(username)) {
    return res.status(400).json({
      ok: false,
      username,
      result: "invalid",
      message: "Roblox usernames must be 3–20 characters and use letters, numbers, or underscores."
    });
  }

  try {
    const response = await fetch("https://users.roblox.com/v1/usernames/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "OGU-Checker/1.0"
      },
      body: JSON.stringify({
        usernames: [username],
        excludeBannedUsers: false
      })
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("Roblox API error:", response.status, body);

      return res.status(502).json({
        ok: false,
        username,
        result: "error",
        message: "Roblox did not return a successful response."
      });
    }

    const data = await response.json();
    const found = Array.isArray(data.data) && data.data.length > 0;

    if (found) {
      const user = data.data[0];
      return res.json({
        ok: true,
        username,
        platform: "Roblox",
        result: "taken",
        message: "Username exists on Roblox.",
        userId: user.id,
        matchedUsername: user.name,
        displayName: user.displayName
      });
    }

    // Important: "not found" is not an absolute guarantee that the name
    // can be registered. Reserved/moderated/unavailable names may also
    // not appear in the lookup response.
    return res.json({
      ok: true,
      username,
      platform: "Roblox",
      result: "not_found",
      message: "No existing Roblox account was returned for this username.",
      availability: "unconfirmed"
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      ok: false,
      username,
      result: "error",
      message: "Could not contact Roblox."
    });
  }
});

app.listen(PORT, () => {
  console.log(`OGU Checker API running on http://localhost:${PORT}`);
});
