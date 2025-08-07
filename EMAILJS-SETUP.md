# 📧 Configuração do EmailJS para Recebimento de Sugestões

Este guia explica como configurar o EmailJS para receber as sugestões dos usuários diretamente no email **aluiza.primo@gmail.com**.

## 🚀 Passo a Passo

### 1. Criar Conta no EmailJS
1. Acesse [https://www.emailjs.com/](https://www.emailjs.com/)
2. Clique em "Sign Up" e crie uma conta gratuita
3. Confirme seu email

### 2. Configurar Serviço de Email
1. No dashboard, clique em "Email Services"
2. Clique em "Add New Service"
3. Escolha "Gmail" (recomendado)
4. Siga as instruções para conectar sua conta Gmail
5. Anote o **Service ID** gerado

### 3. Criar Template de Email
1. Vá para "Email Templates"
2. Clique em "Create New Template"
3. Configure o template com as seguintes informações:

#### **Configurações do Template:**
- **Template Name**: DevHabits Suggestions
- **Subject**: `[DevHabits] {{suggestion_type}}`
- **To Email**: `aluiza.primo@gmail.com`
- **From Name**: `{{from_name}}`
- **Reply To**: `{{reply_to}}`

#### **Corpo do Email:**
```
Olá!

Uma nova sugestão foi enviada através do DevHabits:

📋 Tipo: {{suggestion_type}}
📝 Descrição: 
{{suggestion_text}}

👤 Email do usuário: {{user_email}}
📅 Data/Hora: {{timestamp}}
🌐 Navegador: {{user_agent}}

---
Esta mensagem foi enviada automaticamente pelo sistema DevHabits.
Para responder ao usuário, use o email: {{reply_to}}
```

4. Salve o template e anote o **Template ID**

### 4. Obter Chave Pública
1. Vá para "Account" > "General"
2. Copie sua **Public Key**

### 5. Configurar a Aplicação
1. Abra o arquivo `emailjs-config.js`
2. Substitua os valores pelas suas chaves reais:

```javascript
const EMAILJS_CONFIG = {
    PUBLIC_KEY: "sua_chave_publica_aqui",
    SERVICE_ID: "seu_service_id_aqui", 
    TEMPLATE_ID: "seu_template_id_aqui"
};
```

## 🔧 Variáveis do Template

O sistema envia as seguintes variáveis para o template:

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `suggestion_type` | Tipo da sugestão | "Nova Funcionalidade" |
| `suggestion_text` | Texto da sugestão | "Seria legal ter gráficos..." |
| `user_email` | Email do usuário | "usuario@email.com" |
| `timestamp` | Data/hora do envio | "07/08/2025, 13:30:45" |
| `user_agent` | Navegador do usuário | "Chrome 91.0..." |
| `from_name` | Nome do remetente | "Usuário DevHabits" |
| `reply_to` | Email para resposta | "usuario@email.com" |

## 📋 Tipos de Sugestão

O sistema categoriza as sugestões em:
- **Nova Funcionalidade**: Ideias para novas features
- **Melhoria**: Aprimoramentos em funcionalidades existentes  
- **Bug Report**: Relatos de problemas/erros
- **Sugestão de Design**: Melhorias na interface
- **Outro**: Outras categorias

## 🔒 Segurança

- As chaves do EmailJS são públicas por natureza
- Não há risco de segurança em expô-las no frontend
- O EmailJS tem proteção contra spam e uso abusivo
- Limite de 200 emails/mês no plano gratuito

## 🧪 Teste

Para testar se está funcionando:
1. Abra a aplicação DevHabits
2. Clique em "Sugestões" no cabeçalho
3. Preencha o formulário
4. Clique em "Enviar Sugestão"
5. Verifique se o email chegou em aluiza.primo@gmail.com

## 🆘 Troubleshooting

### Erro "EmailJS não configurado"
- Verifique se o arquivo `emailjs-config.js` está sendo carregado
- Confirme se as chaves estão corretas

### Emails não chegam
- Verifique a pasta de spam
- Confirme se o Service ID e Template ID estão corretos
- Teste o template diretamente no dashboard do EmailJS

### Erro de CORS
- O EmailJS funciona diretamente do navegador
- Não há problemas de CORS com este serviço

## 📞 Suporte

Se precisar de ajuda:
- Documentação oficial: [https://www.emailjs.com/docs/](https://www.emailjs.com/docs/)
- Suporte EmailJS: [https://www.emailjs.com/support/](https://www.emailjs.com/support/)

---

**Nota**: Após configurar, as sugestões serão enviadas automaticamente para **aluiza.primo@gmail.com** sempre que um usuário usar o sistema de sugestões da aplicação.
