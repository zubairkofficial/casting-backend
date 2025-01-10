import jwt from 'jsonwebtoken';

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    // Check if token is provided
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authorization token required' });
    }

    const token = authHeader.split(' ')[1]; // Extract token from "Bearer <token>"

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("Decoded",decoded);
        req.user = decoded; // Store user data in req.user for further use in controllers
        next();
    } catch (error) {
        res.status(403).json({ message: 'Invalid or expired token' });
    }
};

// Add isAdmin middleware
const isAdmin = (req, res, next) => {
    console.log(req.user);
    // Check if user exists and has role information
    if (!req.user || !req.user.role) {
        return res.status(403).json({ 
            message: 'Access forbidden: User role not found' 
        });
    }

    // Check if user is an admin
    if (req.user.role !== 'superadmin') {
        return res.status(403).json({ 
            message: 'Access forbidden: Super Admin privileges required' 
        });
    }

    next();
};

export { authMiddleware as authenticateToken, isAdmin };