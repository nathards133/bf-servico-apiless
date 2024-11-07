import supabase from '../config/supabase.js';

export const auth = async (req, res, next) => {
  try {
    console.log('Headers recebidos:', req.headers);
    
    const authHeader = req.headers.authorization;
    console.log('Auth header:', authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    console.log('Token extraído:', token);
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error) {
      console.error('Auth error:', error);
      return res.status(401).json({ 
        message: 'Invalid token',
        error: error.message 
      });
    }

    console.log('Usuário autenticado:', user);

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ 
      message: 'Authentication failed',
      error: error.message 
    });
  }
};
