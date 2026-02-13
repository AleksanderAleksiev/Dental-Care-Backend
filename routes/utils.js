import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
    try {
        const token = req.cookies.token;

        if (!token) {
            return res.status(403).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_KEY);
        req.userId = decoded.id;
        next();
    }
    catch (err) {
        return res.status(500).json({ message: 'Server error' });
    }
}