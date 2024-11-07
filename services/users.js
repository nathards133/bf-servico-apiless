import express from 'express';
import { auth } from '../middleware/auth.js';
import supabase from '../config/supabase.js';
import axios from 'axios';
import multer from 'multer';

const router = express.Router();
const upload = multer();

// Buscar dados do usuário
router.get('/profile', auth, async (req, res) => {
    try {
        const { data: user, error } = await supabase.auth.admin.getUserById(req.user.id);
        
        if (error) throw error;
        res.json(user);
    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        res.status(500).json({ message: 'Erro ao buscar dados do usuário' });
    }
});

// Atualizar dados do usuário
router.put('/profile', auth, async (req, res) => {
    try {
        const { company, business_type, nfe_config } = req.body;

        const { data, error } = await supabase.auth.admin.updateUserById(
            req.user.id,
            {
                user_metadata: {
                    company,
                    business_type,
                    nfe_config
                }
            }
        );

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        res.status(500).json({ message: 'Erro ao atualizar dados do usuário' });
    }
});

// Buscar dados do CNPJ
router.get('/cnpj/:cnpj', auth, async (req, res) => {
    try {
        const { cnpj } = req.params;
        
        // Busca no ViaCEP
        const viaCepResponse = await axios.get(`https://viacep.com.br/ws/${cnpj}/json/`);
        
        if (viaCepResponse.data.erro) {
            throw new Error('CEP não encontrado');
        }

        const endereco = {
            logradouro: viaCepResponse.data.logradouro,
            bairro: viaCepResponse.data.bairro,
            cidade: viaCepResponse.data.localidade,
            estado: viaCepResponse.data.uf,
            cep: viaCepResponse.data.cep.replace('-', '')
        };

        res.json({ endereco });
    } catch (error) {
        console.error('Erro ao buscar CNPJ:', error);
        res.status(500).json({ message: 'Erro ao buscar dados do CNPJ' });
    }
});

// Upload de logo
router.post('/upload-logo', auth, upload.single('logo'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            throw new Error('Arquivo não encontrado');
        }

        // Obter o nome do arquivo antigo
        const { data: user, error: userError } = await supabase.auth.admin.getUserById(req.user.id);
        if (userError) throw userError;

        // Verifique se user_metadata e company existem
        const oldLogoPath = user.user_metadata?.company?.logo?.split('/').pop();

        // Excluir a imagem antiga, se existir
        if (oldLogoPath) {
            const { error: deleteError } = await supabase.storage
                .from('bf-servico')
                .remove([`logos/${oldLogoPath}`]);

            if (deleteError) throw deleteError;
        }

        const timestamp = Date.now();
        const fileName = `logos/${req.user.id}_${timestamp}_${file.originalname}`;

        const { data, error } = await supabase.storage
            .from('bf-servico')
            .upload(fileName, file.buffer, {
                contentType: file.mimetype
            });

        if (error) throw error;

        const { publicURL } = supabase.storage
            .from('bf-servico')
            .getPublicUrl(fileName);

        const baseUrl = 'https://vivzaeckjwicalmbbcpf.supabase.co/storage/v1/object/public/bf-servico/';
        const logoUrl = `${baseUrl}${fileName}`;

        const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
            req.user.id,
            {
                user_metadata: {
                    ...user.user_metadata,
                    company: {
                        ...user.user_metadata.company,
                        logo: logoUrl,
                        name: user.user_metadata.company.name,
                        cnpj: user.user_metadata.company.cnpj,
                        phone: user.user_metadata.company.phone,
                        description: user.user_metadata.company.description,
                        chatbotInfo: user.user_metadata.company.chatbotInfo,
                        address: user.user_metadata.company.address
                    }
                }
            }
        );

        if (updateError) throw updateError;

        res.json({ logoUrl });
    } catch (error) {
        console.error('Erro no upload:', error);
        res.status(500).json({ message: 'Erro ao fazer upload da logo' });
    }
});

export default router; 