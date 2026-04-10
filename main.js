(() => {
    const KEYS = {
        rooms: 'hotelpos_rooms',
        reservations: 'hotelpos_reservations',
        invoices: 'hotelpos_invoices',
        hotelName: 'hotelpos_name'
    };

    const load = (key, def) => {
        try {
            const v = localStorage.getItem(key);
            return v ? JSON.parse(v) : def;
        } catch {
            return def;
        }
    };

    const saveAll = () => {
        localStorage.setItem(KEYS.rooms, JSON.stringify(rooms));
        localStorage.setItem(KEYS.reservations, JSON.stringify(reservations));
        localStorage.setItem(KEYS.invoices, JSON.stringify(invoices));
        updateDashboard();
    };

    let rooms = load(KEYS.rooms, []);
    let reservations = load(KEYS.reservations, []);
    let invoices = load(KEYS.invoices, []);
    let hotelName = load(KEYS.hotelName, 'Casona FiliBerta');

    // DASHBOARD UPDATES
    const updateDashboard = () => {
        // Branding
        const headerName = document.getElementById('hotel-name-header');
        const sidebarName = document.getElementById('hotel-name-sidebar');
        if (headerName) headerName.textContent = hotelName.toUpperCase();
        if (sidebarName) sidebarName.textContent = hotelName;

        // Stats
        document.getElementById('stat-total-rooms').textContent = rooms.length;
        document.getElementById('stat-active-reservations').textContent = reservations.filter(r => r.status === 'confirmada').length;

        const revenue = invoices.reduce((acc, it) => acc + (it.qty * it.price), 0);
        document.getElementById('stat-total-revenue').textContent = `$${revenue.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`;

        // Recent Activity Table
        const recentBody = document.querySelector('#recent-activity-table tbody');
        recentBody.innerHTML = '';

        const activity = [
            ...rooms.map(r => ({ type: 'Habitacion', detail: `Nueva: ${r.type} (#${r.id})`, date: 'Recién', status: 'activa' })),
            ...reservations.map(r => ({ type: 'Reserva', detail: `Cliente: ${r.client}`, date: r.checkIn, status: r.status })),
            ...invoices.map(i => ({ type: 'Factura', detail: i.description, date: 'Hoy', status: 'completada' }))
        ];

        const displayActivity = activity.reverse().slice(0, 5);

        if (displayActivity.length === 0) {
            recentBody.innerHTML = '<tr><td colspan="4" style="text-align:center; opacity:0.5; padding: 2rem;">Sin actividad reciente.</td></tr>';
        } else {
            displayActivity.forEach(act => {
                const tr = document.createElement('tr');
                const typeClass = act.type.toLowerCase().replace(' ', '-');
                tr.innerHTML = `
          <td><span class="status-badge ${typeClass}">${act.type}</span></td>
          <td>${act.detail}</td>
          <td style="opacity:0.7">${act.date}</td>
          <td><span class="status-badge ${act.status}">${act.status}</span></td>
        `;
                recentBody.appendChild(tr);
            });
        }
    };

    // Render helpers
    const renderRooms = () => {
        const tbody = document.querySelector('#rooms-table tbody');
        tbody.innerHTML = '';
        if (rooms.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; opacity:0.5; padding: 2rem;">No hay habitaciones registradas</td></tr>';
            return;
        }
        rooms.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
        <td>#${r.id}</td>
        <td><strong>${r.type}</strong></td>
        <td>${r.capacity} Pers.</td>
        <td>$${r.price.toFixed(2)}</td>
        <td><i class='bx bx-trash action-icon del-room' data-id="${r.id}" title="Eliminar"></i></td>
      `;
            tbody.appendChild(tr);
        });
        document.querySelectorAll('.del-room').forEach(btn => btn.addEventListener('click', e => {
            const id = Number(e.currentTarget.dataset.id);
            rooms = rooms.filter(x => x.id !== id);
            saveAll();
            renderRooms();
            populateRoomOptions();
        }));
    };

    const renderReservations = () => {
        const tbody = document.querySelector('#reservations-table tbody');
        tbody.innerHTML = '';
        if (reservations.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; opacity:0.5; padding: 2rem;">No hay reservas registradas</td></tr>';
            return;
        }
        reservations.forEach(res => {
            const r = rooms.find(x => x.id === res.roomId);
            const roomLabel = r ? `${r.type} (#${r.id})` : `Hab. ID ${res.roomId}`;
            const tr = document.createElement('tr');
            tr.innerHTML = `
        <td>${res.id}</td>
        <td>${roomLabel}</td>
        <td><strong>${res.client}</strong></td>
        <td>${res.checkIn}</td>
        <td>${res.checkOut}</td>
        <td><span class="status-badge ${res.status}">${res.status}</span></td>
        <td><i class='bx bx-trash action-icon del-res' data-id="${res.id}" title="Eliminar"></i></td>
      `;
            tbody.appendChild(tr);
        });
        document.querySelectorAll('.del-res').forEach(btn => btn.addEventListener('click', e => {
            const id = Number(e.currentTarget.dataset.id);
            reservations = reservations.filter(x => x.id !== id);
            saveAll();
            renderReservations();
        }));
    };

    const renderInvoices = () => {
        const tbody = document.querySelector('#invoices-table tbody');
        tbody.innerHTML = '';
        let total = 0;
        if (invoices.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; opacity:0.5; padding: 2rem;">Sin ítems en la factura actual</td></tr>';
        } else {
            invoices.forEach((it, idx) => {
                const lineTotal = it.qty * it.price;
                total += lineTotal;
                const tr = document.createElement('tr');
                tr.innerHTML = `
            <td>${it.description}</td>
            <td>${it.qty}</td>
            <td>$${it.price.toFixed(2)}</td>
            <td><strong>$${lineTotal.toFixed(2)}</strong></td>
            <td><i class='bx bx-trash action-icon del-inv' data-idx="${idx}" title="Eliminar"></i></td>
          `;
                tbody.appendChild(tr);
            });
        }
        document.getElementById('invoice-total').textContent = `$${total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`;

        // UI for Print Ticket
        const invoiceSection = document.getElementById('facturas');
        const actionsContainer = invoiceSection.querySelector('div[style*="justify-content: flex-end"]');
        let printBtn = document.getElementById('btn-print-ticket');

        if (invoices.length > 0) {
            if (!printBtn) {
                printBtn = document.createElement('button');
                printBtn.id = 'btn-print-ticket';
                printBtn.className = 'primary-btn';
                printBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                printBtn.innerHTML = "<i class='bx bx-printer'></i> Imprimir Ticket";
                printBtn.onclick = printTicket;
                actionsContainer.appendChild(printBtn);
            }
        } else if (printBtn) {
            printBtn.remove();
        }

        document.querySelectorAll('.del-inv').forEach(btn => btn.addEventListener('click', e => {
            const idx = Number(e.currentTarget.dataset.idx);
            invoices.splice(idx, 1);
            saveAll();
            renderInvoices();
        }));
    };

    const printTicket = () => {
        const total = invoices.reduce((acc, it) => acc + (it.qty * it.price), 0);
        const date = new Date().toLocaleString('es-ES');

        const ticketWindow = window.open('', '_blank', 'width=400,height=600');
        ticketWindow.document.write(`
      <html>
        <head>
          <title>Ticket de Venta - ${hotelName}</title>
          <style>
            body { font-family: 'Courier New', monospace; padding: 20px; color: #000; }
            .header { text-align: center; border-bottom: 1px dashed #000; margin-bottom: 10px; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; }
            th { text-align: left; border-bottom: 1px solid #000; }
            .total { text-align: right; margin-top: 15px; border-top: 1px dashed #000; padding-top: 5px; font-weight: bold; font-size: 1.2em; }
            .footer { text-align: center; margin-top: 20px; font-size: 0.8em; }
            @media print { margin: 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h3 style="text-transform: uppercase;">${hotelName}</h3>
            <p>Sistema Hotelero Premium</p>
            <p>${date}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Cant</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${invoices.map(it => `
                <tr>
                  <td>${it.description}</td>
                  <td>${it.qty}</td>
                  <td>$${(it.qty * it.price).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total">TOTAL: $${total.toFixed(2)}</div>
          <div class="footer">
            <p>¡Gracias por elegir ${hotelName}!</p>
            <p>Conserve su ticket para cualquier reclamo.</p>
          </div>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
        ticketWindow.document.close();
    };

    const populateRoomOptions = () => {
        const select = document.getElementById('reserve-room');
        if (!select) return;
        select.innerHTML = '<option value="">Selecciona habitación...</option>';
        rooms.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r.id;
            opt.textContent = `${r.type} - ID ${r.id} ($${r.price}/noche)`;
            select.appendChild(opt);
        });
    };

    // Form handlers
    document.getElementById('form-new-room').addEventListener('submit', e => {
        e.preventDefault();
        const type = (document.getElementById('room-type').value || '').trim();
        const capacity = Number(document.getElementById('room-capacity').value);
        const price = Number(document.getElementById('room-price').value);
        if (!type || !capacity || isNaN(price)) return;
        const id = rooms.length ? Math.max(...rooms.map(r => r.id)) + 1 : 101;
        rooms.push({ id, type, capacity, price });
        saveAll();
        renderRooms();
        populateRoomOptions();
        e.target.reset();
    });

    document.getElementById('form-new-reservation').addEventListener('submit', e => {
        e.preventDefault();
        const roomId = Number(document.getElementById('reserve-room').value);
        const client = (document.getElementById('reserve-client').value || '').trim();
        const checkIn = document.getElementById('reserve-checkin').value;
        const checkOut = document.getElementById('reserve-checkout').value;
        const status = document.getElementById('reserve-status').value;
        if (!roomId || !client || !checkIn || !checkOut) return;
        const id = reservations.length ? Math.max(...reservations.map(r => r.id)) + 1 : 1001;
        reservations.push({ id, roomId, client, checkIn, checkOut, status });
        saveAll();
        renderReservations();
        e.target.reset();
    });

    document.getElementById('form-new-invoice').addEventListener('submit', e => {
        e.preventDefault();
        const description = (document.getElementById('inv-desc').value || '').trim();
        const qty = Number(document.getElementById('inv-qty').value);
        const price = Number(document.getElementById('inv-price').value);
        if (!description || isNaN(qty) || isNaN(price)) return;
        invoices.push({ description, qty, price });
        saveAll();
        renderInvoices();
        e.target.reset();
    });

    // Tabs / Navigation
    const showTab = (name) => {
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tabbtn').forEach(b => b.classList.remove('active'));
        const targetTab = document.getElementById(name);
        if (targetTab) targetTab.classList.add('active');
        const activeBtn = document.querySelector(`.tabbtn[data-tab="${name}"]`);
        if (activeBtn) activeBtn.classList.add('active');
        const titleMap = {
            'dashboard': ['Dashboard Principal', 'Resumen operativo y estado del hotel.'],
            'habitaciones': ['Gestión de Habitaciones', 'Administra el inventario y categorías de alojamiento.'],
            'reservas': ['Control de Reservas', 'Calendario y estado de ocupación de huéspedes.'],
            'facturas': ['Módulo de Facturación', 'Genera cobros por servicios y consumos.'],
            'reportes': ['Estadísticas y Reportes', 'Analiza el rendimiento y métricas clave de tu hotel.']
        };
        if (titleMap[name]) {
            document.getElementById('view-title').textContent = titleMap[name][0];
            document.getElementById('view-subtitle').textContent = titleMap[name][1];
        }
    };

    // Brand Edit Interactivity
    const headerTag = document.querySelector('.hotel-brand-tag');
    if (headerTag) {
        headerTag.style.cursor = 'pointer';
        headerTag.title = 'Haz clic para cambiar el nombre del hotel';
        headerTag.addEventListener('click', () => {
            const newName = prompt('Introduce el nombre de tu hotel:', hotelName);
            if (newName && newName.trim()) {
                hotelName = newName.trim();
                localStorage.setItem(KEYS.hotelName, JSON.stringify(hotelName));
                updateDashboard();
            }
        });
    }

    document.querySelectorAll('.tabbtn').forEach(btn => btn.addEventListener('click', e => {
        const t = e.currentTarget.dataset.tab;
        showTab(t);
    }));

    const updateDate = () => {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateElement = document.getElementById('current-date');
        if (dateElement) dateElement.textContent = new Date().toLocaleDateString('es-ES', options);
    };

    // Init
    if (!rooms.length) {
        rooms = [
            { id: 101, type: 'Habitación Estándar', capacity: 2, price: 45 },
            { id: 202, type: 'Suite Ejecutiva', capacity: 2, price: 85 },
            { id: 303, type: 'Suite Presidencial', capacity: 4, price: 180 }
        ];
    }

    updateDate();
    renderRooms();
    populateRoomOptions();
    renderReservations();
    renderInvoices();
    updateDashboard();

    // Initialize dashboard
    updateDashboard();
})();
