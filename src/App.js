import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sample from './pages/Sample';
import Level from './pages/Employee/level/Level';
import Position from './pages/Employee/position/Position';
import Employee from './pages/Employee/employee/Employee';

function App() {
  return (
      <Router>
        <Routes>
          {/* Public Route */}
          <Route path="/" element={<Sample/>} />
          <Route path="/emp/lvl" element={<Level/>} />
          <Route path="/emp/pos" element={<Position/>} />
          <Route path="/emp/manage" element={<Employee/>} />
          </Routes>
      </Router>
  );
}

export default App;
