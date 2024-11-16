const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const cors = require('cors');
const admin = require('firebase-admin');
const app = express();
const PORT = 5000;

app.use(bodyParser.json());
app.use(cors());

let otpStorage = {};
const serviceAccount = require('./jpro-firebase-firebase-adminsdk-wk2lr-20dc41feb0.json'); // Replace with the path to your service account key file
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const auth = admin.auth();

const staffCredentials = {
  username: 'staff',
  password: 'staff123',
};

app.post('/api/staffLogin', (req, res) => {
  const { username, password } = req.body;
  if (
    username === staffCredentials.username &&
    password === staffCredentials.password
  ) {
    res.status(200).json({ success: true, message: 'Login successful' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});


const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'sarathirevo@gmail.com', // Replace with your email
    pass: 'hcaj atsg bukb xumy', // Replace with your app-specific password
  },
});
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // Get token from Authorization header
  if (!token) return res.status(401).send('Unauthorized');

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).send('Unauthorized');
  }
};
app.get('/api/getUsers', async (req, res) => {
  try {
    const auth = admin.auth();
    let users = [];
    let nextPageToken;

    do {
      const listUsersResult = await auth.listUsers(100, nextPageToken);
      users = users.concat(
        listUsersResult.users.map(user => ({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'N/A',
          phoneNumber: user.phoneNumber || 'N/A',
        }))
      );
      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);

    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Unable to fetch users' });
  }
});



app.post('/sendOtp', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required.' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStorage[email] = otp;

  const mailOptions = {
    from: 'sarathirevo@gmail.com',
    to: email,
    subject: 'Your OTP for Verification',
    text: `Your OTP is: ${otp}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
      return res.status(500).json({ success: false, message: 'Failed to send OTP.' });
    }
    res.json({ success: true, message: 'OTP sent successfully.' });
  });
});

app.post('/verifyOtp', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
  }

  if (otpStorage[email] === otp) {
    delete otpStorage[email];
    res.json({ success: true, message: 'OTP verified successfully.' });
  } else {
    res.status(400).json({ success: false, message: 'Invalid OTP.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});