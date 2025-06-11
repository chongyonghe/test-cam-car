class RobotController {
  constructor() {
    this.robotWebSocket = null;
    this.cameraWebSocket = null;
    this.isConnected = false;
    this.lastIP = localStorage.getItem('lastRobotIP') || '192.168.4.1';

    this.initElements();
    this.initEventListeners();
    this.initCameraWebSocket();
  }

  initElements() {
    this.robotIpInput = document.getElementById('robotIp');
    this.connectBtn = document.getElementById('connectBtn');
    this.connectionStatus = document.getElementById('connectionStatus');
    this.cameraImage = document.getElementById('cameraImage');
    this.speedControl = document.getElementById('speedControl');
    this.lightControl = document.getElementById('lightControl');
    this.controlButtons = document.querySelectorAll('.control-btn');
    this.startAutomationBtn = document.getElementById('startAutomation');
    this.stopAutomationBtn = document.getElementById('stopAutomation');

    this.robotIpInput.value = this.lastIP;
  }

  initEventListeners() {
    this.connectBtn.addEventListener('click', () => this.toggleConnection());
    this.robotIpInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.toggleConnection();
    });

    this.speedControl.addEventListener('input', (e) => {
      this.sendCommand('Speed', e.target.value);
    });

    this.lightControl.addEventListener('input', (e) => {
      this.sendCommand('Light', e.target.value);
    });

    this.controlButtons.forEach(btn => {
      btn.addEventListener('mousedown', () => {
        this.sendCommand(btn.dataset.action, btn.dataset.value);
      });
      btn.addEventListener('mouseup', () => {
        this.sendCommand(btn.dataset.action, '0');
      });
      btn.addEventListener('touchstart', () => {
        this.sendCommand(btn.dataset.action, btn.dataset.value);
      });
      btn.addEventListener('touchend', () => {
        this.sendCommand(btn.dataset.action, '0');
      });
    });

    this.startAutomationBtn.addEventListener('click', () => {
      this.sendCommand('Command', 'start');
    });

    this.stopAutomationBtn.addEventListener('click', () => {
      this.sendCommand('Command', 'stop');
    });
  }

  toggleConnection() {
    const ip = this.robotIpInput.value.trim();
    
    if (!ip) {
      this.updateStatus("Please enter IP address", "danger");
      return;
    }

    if (!this.isValidIP(ip)) {
      this.updateStatus("Invalid IP format", "danger");
      return;
    }

    if (this.isConnected) {
      this.disconnectFromRobot();
    } else {
      this.connectToRobot(ip);
    }
  }

  isValidIP(ip) {
    return /^(\d{1,3}\.){3}\d{1,3}$/.test(ip);
  }

  connectToRobot(ip) {
    this.updateStatus("Connecting...", "warning");
    
    this.robotWebSocket = new WebSocket(`ws://${ip}/CarInput`);
    
    this.robotWebSocket.onopen = () => {
      this.isConnected = true;
      this.updateStatus("Connected", "success");
      this.connectBtn.classList.replace('btn-outline-success', 'btn-outline-danger');
      this.connectBtn.textContent = 'Disconnect';
      localStorage.setItem('lastRobotIP', ip);
      
      // Initialize camera with new IP
      this.initCameraWebSocket(ip);
      
      // Send initial values
      this.sendCommand('Speed', this.speedControl.value);
      this.sendCommand('Light', this.lightControl.value);
    };
    
    this.robotWebSocket.onclose = () => {
      this.handleDisconnection();
    };
    
    this.robotWebSocket.onerror = (error) => {
      console.error('WebSocket Error:', error);
      this.updateStatus("Connection failed", "danger");
      this.handleDisconnection();
    };
  }

  handleDisconnection() {
    this.isConnected = false;
    this.updateStatus("Disconnected", "secondary");
    this.connectBtn.classList.replace('btn-outline-danger', 'btn-outline-success');
    this.connectBtn.textContent = 'Connect';
  }

  disconnectFromRobot() {
    if (this.robotWebSocket) {
      this.robotWebSocket.close();
    }
    if (this.cameraWebSocket) {
      this.cameraWebSocket.close();
    }
  }

  initCameraWebSocket(ip = this.lastIP) {
    if (this.cameraWebSocket) {
      this.cameraWebSocket.close();
    }

    const cameraUrl = `ws://${ip}/Camera`;
    this.cameraWebSocket = new WebSocket(cameraUrl);
    this.cameraWebSocket.binaryType = 'blob';
    
    this.cameraWebSocket.onmessage = (event) => {
      this.cameraImage.src = URL.createObjectURL(event.data);
    };
    
    this.cameraWebSocket.onclose = () => {
      if (this.isConnected) {
        setTimeout(() => this.initCameraWebSocket(ip), 2000);
      }
    };
  }

  sendCommand(key, value) {
    if (this.robotWebSocket && this.robotWebSocket.readyState === WebSocket.OPEN) {
      const data = `${key},${value}`;
      this.robotWebSocket.send(data);
    }
  }

  updateStatus(message, type) {
    this.connectionStatus.textContent = message;
    this.connectionStatus.className = `badge bg-${type}`;
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new RobotController();
});