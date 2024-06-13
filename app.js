const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const { engine } = require('express-handlebars');
const path = require('path');
const session = require('express-session');
const { Product } = require('./models');

const app = express();

app.engine('handlebars', engine({ defaultLayout: 'main' }));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'loja-virtual',
  resave: false,
  saveUninitialized: true
}));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });


app.get('/', async (req, res) => {
  try {
    const products = await Product.findAll();
    const productData = products.map(product => product.dataValues);
    res.render('home', { products: productData });
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao carregar os produtos');
  }
});

app.get('/products/new', (req, res) => {
  res.render('new-product');
});

app.post('/products', upload.single('image'), async (req, res) => {
  try {
    const { name, description, price } = req.body;
    const image = req.file ? req.file.filename : null;
    await Product.create({ name, description, price, image });
    res.redirect('/');
  } catch (error) {
    res.status(500).send('Erro ao criar o produto');
  }
});

app.get('/cart', async (req, res) => {
  try {
    const cart = req.session.cart || [];
    const cartWithData = [];
    
    for (const item of cart) {
      const product = await Product.findByPk(item.id);
      if (product) {
        cartWithData.push({
          id: product.id,
          name: product.name,
          image: product.image,
          price: parseInt(product.price).toFixed(2),
          quantity: item.quantity
        });
      }
    }

    res.render('cart', { cart: cartWithData });
  } catch (error) {
    res.status(500).send('Erro ao carregar o carrinho de compras');
  }
});

app.post('/cart/add', (req, res) => {
  const { id } = req.body;
  const cart = req.session.cart || [];
  const product = cart.find(item => item.id === id);

  if (product) {
    product.quantity += 1;
  } else {
    cart.push({ id, quantity: 1 });
  }

  req.session.cart = cart;
  res.redirect('/cart');
});

app.post('/cart/remove', (req, res) => {
  const { id } = req.body;
  let cart = req.session.cart || [];
  cart = cart.filter(item => item.id !== id);
  req.session.cart = cart;
  res.redirect('/cart');
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
