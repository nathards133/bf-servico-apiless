import express from 'express';
import supabase from '../config/supabase.js';

const router = express.Router();

router.post('/register', async (req, res) => {
	try {
		const { 
			email, 
			password, 
			company, 
			businessType,
			cnpj,
			phone,
			address
		} = req.body;

		// Validações
		if (!email || !password || !company || !cnpj) {
			return res.status(400).json({ message: 'Campos obrigatórios faltando' });
		}

		// 1. Criar usuário na autenticação do Supabase
		const { data: authData, error: authError } = await supabase.auth.admin.createUser({
			email,
			password,
			user_metadata: {
				role: 'user'
			}
		});

		if (authError) throw authError;

		// 2. Criar registro na tabela public.users
		const { data: userData, error: userError } = await supabase
			.from('users')
			.insert({
				id: authData.user.id, // Usar mesmo ID da autenticação
				email,
				role: 'user',
				company: {
					name: company,
					cnpj,
					phone,
					address
				},
				business_type: businessType,
				has_certificate: false,
				nfe_config: {
					ambiente: 'homologacao',
					serie: '1',
					numero_inicial: 1
				},
				active: true
			})
			.select()
			.single();

		if (userError) {
			// Rollback: deletar usuário da autenticação se falhar
			await supabase.auth.admin.deleteUser(authData.user.id);
			throw userError;
		}

		res.status(201).json({ message: 'Usuário registrado com sucesso' });
	} catch (error) {
		console.error('Erro ao registrar usuário:', error);
		res.status(500).json({ message: error.message });
	}
});

router.post('/login', async (req, res) => {
	try {
		const { email, password } = req.body;

		const { data: { user, session }, error } = await supabase.auth.signInWithPassword({
			email,
			password
		});

		if (error) throw error;

		// Retornar dados do usuário e token
		res.json({
			token: session.access_token,
			user: {
				id: user.id,
				email: user.email,
				role: user.user_metadata.role,
				company: user.user_metadata.company,
				businessType: user.user_metadata.businessType
			}
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});

// ... outras rotas necessárias ...

export default router;
