import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import NewJob from "./pages/NewJob";

function App() {
  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/NewJob" element={<NewJob />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
