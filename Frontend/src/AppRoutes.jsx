import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Register from './pages/Register';
import Login from './pages/Login';
import Gems from './pages/Gems';
import GemEditor from './pages/GemEditor';
import ProtectedAuthRoute from './components/ProtectedAuthRoute';
import AccessRequired from './pages/AccessRequired';
import NotFound from './pages/NotFound';


const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/chats/:chatId' element={<Home />} />
        <Route path='/register' element={<Register />} />
        <Route path='/login' element={<Login />} />
        <Route path='/access-required' element={<AccessRequired />} />
        <Route path='/gems' element={<ProtectedAuthRoute><Gems /></ProtectedAuthRoute>} />
        <Route path='/gems/new' element={<ProtectedAuthRoute><GemEditor /></ProtectedAuthRoute>} />
        <Route path='/gems/:gemId/edit' element={<ProtectedAuthRoute><GemEditor /></ProtectedAuthRoute>} />
        <Route path='*' element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;