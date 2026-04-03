import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Register from './pages/Register';
import Login from './pages/Login';
import Gems from './pages/Gems';
import GemEditor from './pages/GemEditor';


const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/chats/:chatId' element={<Home />} />
        <Route path='/register' element={<Register />} />
        <Route path='/login' element={<Login />} />
        <Route path='/gems' element={<Gems />} />
        <Route path='/gems/new' element={<GemEditor />} />
        <Route path='/gems/:gemId/edit' element={<GemEditor />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;