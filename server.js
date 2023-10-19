const express = require('express');
const app = express();
const cors = require('cors');
const nodemailer = require('nodemailer');
const axios = require('axios');
const port = 2023;
//para escribir nuestro archivo
const fs = require('fs');
//para generar un id unico
const { v4: uuidv4 } = require('uuid');
//para usar el .env
require('dotenv').config();
//url de la api de indicadores economicos
const apiMindicadores = 'https://mindicador.cl/api';

//middleware
app.use(cors());
app.use(express.json());


//ruta envio de mails
app.post('/enviar-correo', async (req, res) => {
    const lista_email = req.body.lista_email;
    const asunto = req.body.asunto;

    try {
        if (lista_email && asunto) {
            const indicadoresEconomicos = await getApiData();
            const res_envio = await enviarEmail(lista_email, asunto, indicadoresEconomicos);
            console.log('res envio', res_envio);
            if (res_envio) {
                res.send('Email enviado exitosamente');
            } else {
                res.send('Hubo un problema al enviar el email');
            }
        }
    } catch (error) {
        console.log('error al enviar:', error);
        res.send('Hubo un error al enviar el email');
    }
});//aqui termina la ruta

// funcion para capturar y guardar la data de la api de indicadores economicos
const getApiData = () => {
    return axios.get(apiMindicadores).then(response => {
        const indicadores = response.data;
        const indicadoresEconomicos = {
            uf: indicadores.uf.valor,
            utm: indicadores.utm.valor,
            dolar: indicadores.dolar.valor,
            euro: indicadores.euro.valor
        };
        console.log(indicadoresEconomicos);
        return indicadoresEconomicos;
    });
};

//funcion para enviar el Email con los indicadores economicos, se usa el módulo nodemailer
const enviarEmail = (lista_email, asunto, indicadores) => {
    let result = true;
    const to_ = lista_email.join(',');
    //con esto generamos un id unico para cada correo enviado
    const correoId = uuidv4();
    //definimos transporter y usamos el metodo createTransport de nodemailer. con esto definimos el servicio (outlook), el usuario y contraseña desde donde nuestra app enviará el email.
    let transporter = nodemailer.createTransport({
        service: process.env.SMTP_SERVICE,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
    //aqui definimos las opciones del email, remitente, receptores, asunto y contenido
    let opcionesEmail = {
        from: process.env.SMTP_USER,
        to: to_,
        subject: asunto,
        //llama a la funcion indicadores con los datos que requerimos de la api de indicadores economicos
        html: `<h1>Hola! Los Indicadores Económicos del día de Hoy son los siguientes:</h1>
            <p>El valor de la UF el día de hoy es: ${indicadores.uf}</p>
            <p>El valor de la UTM el día de hoy es: ${indicadores.utm}</p>
            <p>El valor del Dólar el día de hoy es: ${indicadores.dolar}</p>
            <p>El valor del Euro el día de hoy es: ${indicadores.euro}</p>`
    };
    //este método envia el email con las configuraciones que hicimos antes
    transporter.sendMail(opcionesEmail, (err, data) => {
        if (err) {
            console.log('error al enviar: ', err);
            return;
        }
        if (data) {
            console.log('data envio', data);
            result = true;
        }
        //esta funcion escribe cada email enviado con un id unico en un archivo .txt en la carpeta correos. Ademas, cada archivo contiene la lista de emails, el asunto y el contenido.
        const archivoCorreo = `correos/${correoId}.txt`;//aqui definimos la ruta y el nombre del archivo
        //aqui le decimos que es lo que tiene que escribir en el txt
        const contenidoCorreo = `ID del correo: ${correoId}\n\nLista de destinatarios: ${to_}\n\nAsunto: ${asunto}\n\nContenido:\n${opcionesEmail.html}`;
        fs.writeFile(archivoCorreo, contenidoCorreo, err => {
            if (err) {
                console.log('Error al guardar el archivo de correo:', err);
            return;
        }
        console.log('Correo guardado como archivo:', archivoCorreo);
    });
    });
    return new Promise((resolve, reject) => {
    resolve(result);
    });   
};//aqui termina la funcion enviar email

app.listen(port, () => {
    console.log(`El servidor está funcionando en el puerto ${port}`);
});
