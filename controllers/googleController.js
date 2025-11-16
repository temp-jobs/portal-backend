import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate random password for Google users
function generateAutoPassword(email) {
  return "GOOGLE_" + bcrypt.hashSync(email + Date.now(), 10);
}

export const googleAuth = async (req, res) => {
  try {
    const { token, role } = req.body;

    if (!token) return res.status(400).json({ message: "Google token missing" });

    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload.email;
    const name = payload.name;
    const googleId = payload.sub;

    if (!email) return res.status(400).json({ message: "Google email missing" });

    // Check if user exists
    let user = await User.findOne({ email });

    // If user exists → LOGIN (no role needed)
    if (user) {
      const signedToken = jwt.sign(
        { user: { id: user._id, role: user.role } },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.json({
        message: "Login successful",
        token: signedToken,
        user: {
          id: user._id,
          name: user.name,
          companyName: user.companyName,
          email: user.email,
          role: user.role,
          profileCompleted: user.profileCompleted,
        },
      });
    }

    // New user → requires role (only on first signup)
    if (!role) return res.status(400).json({ message: "For first time signup need to go on signup page and select Role." });

    // Create auto-password
    const autoPassword = generateAutoPassword(email);

    // Create new user with auto-filled name/companyName
    const newUserData = {
      email,
      password: autoPassword,
      role,
      googleId,
      profileCompleted: false,
    };

    if (role === "jobseeker") newUserData.name = name;
    else if (role === "employer") newUserData.companyName = name;

    user = new User(newUserData);
    await user.save();

    const signedToken = jwt.sign(
      { user: { id: user._id, role: user.role } },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    

    res.json({
      message: "Account created successfully",
      token: signedToken,
      user: {
        id: user._id,
        name: user.name,
        companyName: user.companyName,
        email: user.email,
        role: user.role,
        profileCompleted: user.profileCompleted,
      },

    });
  } catch (err) {
    console.error("Google Auth Error:", err);
    res.status(500).json({ message: "Google authentication failed" });
  }
};
