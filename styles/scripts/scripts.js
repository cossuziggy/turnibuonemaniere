document.addEventListener('DOMContentLoaded', function() {
  const elements = {
    restaurantForm: document.getElementById('restaurantForm'),
    employeeForm: document.getElementById('employeeForm'),
    economicDataForm: document.getElementById('economicDataForm'),
    weekPicker: document.getElementById('weekPicker'),
    saveRestaurantButton: document.getElementById('saveRestaurant'),
    deleteWeekButton: document.getElementById('deleteWeek'),
    addEmployeeButton: document.getElementById('addEmployee'),
    deleteAllEmployeesButton: document.getElementById('deleteAllEmployees'),
    addEconomicDataButton: document.getElementById('addEconomicData'),
    deleteEconomicDataButton: document.getElementById('deleteEconomicData'),
    saveShiftsButton: document.getElementById('saveShifts'),
    clearShiftsButton: document.getElementById('clearShifts'),
    saveAllButton: document.getElementById('saveAll'),
    loadAllButton: document.getElementById('loadAll'),
    printPdfButton: document.getElementById('printPdf'),
    employeesDiv: document.getElementById('employees'),
    hoursSummaryDiv: document.getElementById('hoursSummary'),
    totalForecastRevenueP: document.getElementById('totalForecastRevenue'),
    totalNetForecastRevenueP: document.getElementById('totalNetForecastRevenue'),
    totalActualRevenueP: document.getElementById('totalActualRevenue'),
    totalNetActualRevenueP: document.getElementById('totalNetActualRevenue'),
    totalHourlyCostP: document.getElementById('totalHourlyCost'),
    laborCostPercentageForecastP: document.getElementById('laborCostPercentageForecast'),
    laborCostPercentageActualP: document.getElementById('laborCostPercentageActual'),
    actualToForecastRevenuePercentageP: document.getElementById('actualToForecastRevenuePercentage'),
    totalProductivityForecastP: document.getElementById('totalProductivityForecast'),
    totalProductivityActualP: document.getElementById('totalProductivityActual'),
    roleSummaryDiv: document.getElementById('roleSummary'),
    savedWeeksSelect: document.getElementById('savedWeeks'),
    loadWeekButton: document.getElementById('loadWeek'),
    createNewButton: document.getElementById('createNew'),
    generalHourlyCost: document.getElementById('generalHourlyCost')
  };

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  let restaurant = {
    name: '',
    week: '',
    employees: [],
    shifts: Array(7).fill(null).map(() => []),
    economicData: {},
    history: []
  };

  let isMouseDown = false;
  let startCell = null;

  const generateShiftTable = (day) => {
    const table = document.querySelector(`.shift-table[data-day="${day}"] thead tr`);
    table.innerHTML = '<th>Dipendente (Ruolo)</th>';
    for (let hour = 9; hour <= 24; hour++) {
      for (let half = 0; half < 2; half++) {
        const th = document.createElement('th');
        th.textContent = `${hour < 10 ? '0' : ''}${hour}:${half === 0 ? '00' : '30'}`;
        table.appendChild(th);
      }
    }
    table.innerHTML += '<th>01:00</th><th>01:30</th>';
  };

  const renderShiftTable = () => {
    for (let day = 0; day < 7; day++) {
      const tableBody = document.querySelector(`.shift-table[data-day="${day}"] tbody`);
      tableBody.innerHTML = '';
      restaurant.employees.sort((a, b) => a.role.localeCompare(b.role)).forEach((employee, empIndex) => {
        const row = document.createElement('tr');
        const nameCell = document.createElement('td');
        nameCell.textContent = `${employee.name} (${employee.role})`;
        row.appendChild(nameCell);
        for (let hour = 9; hour <= 24; hour++) {
          for (let half = 0; half < 2; half++) {
            const time = `${hour < 10 ? '0' : ''}${hour}:${half === 0 ? '00' : '30'}`;
            const cell = document.createElement('td');
            cell.dataset.time = time;
            cell.dataset.empIndex = empIndex;
            cell.dataset.day = day;
            cell.dataset.role = employee.role;
            cell.addEventListener('mousedown', function(e) {
              handleMouseDown(cell, e);
            });
            cell.addEventListener('mouseover', function(e) {
              handleMouseOver(cell, e);
            });
            cell.addEventListener('mouseup', function(e) {
              handleMouseUp(cell, e);
            });
            row.appendChild(cell);
          }
        }
        for (let time of ['01:00', '01:30']) {
          const cell = document.createElement('td');
          cell.dataset.time = time;
          cell.dataset.empIndex = empIndex;
          cell.dataset.day = day;
          cell.dataset.role = employee.role;
          cell.addEventListener('mousedown', function(e) {
            handleMouseDown(cell, e);
          });
          cell.addEventListener('mouseover', function(e) {
            handleMouseOver(cell, e);
          });
          cell.addEventListener('mouseup', function(e) {
            handleMouseUp(cell, e);
          });
          row.appendChild(cell);
        }
        tableBody.appendChild(row);
      });
    }
    document.addEventListener('mouseup', handleMouseUpOutside);
  };

  const handleMouseDown = (cell, event) => {
    isMouseDown = true;
    startCell = cell;
    toggleShiftSelection(cell);
  };

  const handleMouseOver = (cell, event) => {
    if (isMouseDown) {
      toggleShiftSelection(cell);
    }
  };

  const handleMouseUp = (cell, event) => {
    if (isMouseDown) {
      isMouseDown = false;
      updateEmployeeHours();
      renderEmployees();
      updateDashboard();
    }
  };

  const handleMouseUpOutside = (event) => {
    if (isMouseDown) {
      isMouseDown = false;
      updateEmployeeHours();
      renderEmployees();
      updateDashboard();
    }
  };

  const toggleShiftSelection = (cell) => {
    const day = cell.dataset.day;
    const empIndex = cell.dataset.empIndex;
    const time = cell.dataset.time;
    const shiftIndex = restaurant.shifts[day][empIndex].indexOf(time);

    if (shiftIndex === -1) {
      restaurant.shifts[day][empIndex].push(time);
      cell.classList.add('selected');
    } else {
      restaurant.shifts[day][empIndex].splice(shiftIndex, 1);
      cell.classList.remove('selected');
    }
  };

  const updateEmployeeHours = () => {
    restaurant.employees.forEach((employee, empIndex) => {
      let totalSelectedSlots = 0;
      restaurant.shifts.forEach(dayShifts => {
        totalSelectedSlots += dayShifts[empIndex].length;
      });

      let hoursUsed = 0;
      let daySelectedSlots = 0;

      restaurant.shifts.forEach(dayShifts => {
        daySelectedSlots = dayShifts[empIndex].length;
        if (daySelectedSlots >= 3) {
          hoursUsed += 1 + (daySelectedSlots - 3) * 0.5;
        } else if (daySelectedSlots === 2) {
          hoursUsed += 0.5;
        }
      });

      employee.remainingHours = employee.weeklyHours - hoursUsed;
    });

    renderDailyHours();
  };

  const renderDailyHours = () => {
    restaurant.employees.forEach((employee, empIndex) => {
      const dailyHours = days.map((_, dayIndex) => {
        const dayShifts = restaurant.shifts[dayIndex][empIndex];
        let dayHours = 0;
        let slotsCount = dayShifts.length;

        if (slotsCount >= 3) {
          dayHours = 1 + (slotsCount - 3) * 0.5;
        } else if (slotsCount === 2) {
          dayHours = 0.5;
        }

        return `${dayHours} ore`;
      });

      const employeeDiv = document.querySelector(`.employee[data-emp-index="${empIndex}"] .daily-hours`);
      employeeDiv.innerHTML = dailyHours.join(' | ');
    });
  };

  const calculateLaborCost = (day) => {
    let totalHours = 0;
    let totalCost = 0;

    restaurant.employees.forEach((employee, empIndex) => {
      const dayShifts = restaurant.shifts[day][empIndex];
      let hoursUsed = 0;
      let slotsCount = dayShifts.length;

      if (slotsCount >= 3) {
        hoursUsed = 1 + (slotsCount - 3) * 0.5;
      } else if (slotsCount === 2) {
        hoursUsed = 0.5;
      }

      const roleCost = restaurant.economicData[`averageHourlyCost${employee.role}`] || 0;
      totalHours += hoursUsed;
      totalCost += hoursUsed * roleCost;
    });

    return { totalHours, totalCost };
  };

  const calculateProductivity = (netRevenue, day) => {
    let totalHours = 0;

    restaurant.employees.forEach((employee, empIndex) => {
      const dayShifts = restaurant.shifts[day][empIndex];
      let hoursUsed = 0;
      let slotsCount = dayShifts.length;

      if (slotsCount >= 3) {
        hoursUsed = 1 + (slotsCount - 3) * 0.5;
      } else if (slotsCount === 2) {
        hoursUsed = 0.5;
      }

      totalHours += hoursUsed;
    });

    return netRevenue / totalHours;
  };

  const calculateRoleStatistics = () => {
    const roleStats = {};
    for (let day = 0; day < 7; day++) {
      restaurant.employees.forEach((employee, empIndex) => {
        if (!roleStats[employee.role]) {
          roleStats[employee.role] = {
            totalHours: 0,
            totalAssignedHours: 0,
            totalRemainingHours: 0,
            totalEmployees: 0,
            totalLaborCost: 0,
            totalProductivityForecast: 0,
            totalProductivityActual: 0,
            totalForecastRevenue: 0,
            totalActualRevenue: 0,
          };
        }
        roleStats[employee.role].totalEmployees += 1;
        roleStats[employee.role].totalHours += employee.weeklyHours;
        roleStats[employee.role].totalAssignedHours += employee.weeklyHours - employee.remainingHours;
        roleStats[employee.role].totalRemainingHours += employee.remainingHours;

        const dayShifts = restaurant.shifts[day][empIndex];
        let slotsCount = dayShifts.length;
        let hoursUsed = 0;
        if (slotsCount >= 3) {
          hoursUsed = 1 + (slotsCount - 3) * 0.5;
        } else if (slotsCount === 2) {
          hoursUsed = 0.5;
        }

        const roleCost = restaurant.economicData[`averageHourlyCost${employee.role}`] || 0;
        roleStats[employee.role].totalLaborCost += hoursUsed * roleCost;
        roleStats[employee.role].totalProductivityForecast += calculateProductivity(restaurant.economicData.forecastRevenue[day], day);
        roleStats[employee.role].totalProductivityActual += calculateProductivity(restaurant.economicData.actualRevenue[day], day);
        roleStats[employee.role].totalForecastRevenue += restaurant.economicData.forecastRevenue[day] || 0;
        roleStats[employee.role].totalActualRevenue += restaurant.economicData.actualRevenue[day] || 0;
      });
    }
    return roleStats;
  };

  const updateRoleSummary = () => {
    const roleStats = calculateRoleStatistics();
    elements.roleSummaryDiv.innerHTML = '<h3>Statistiche per Ruolo</h3>';
    for (const role in roleStats) {
      const stats = roleStats[role];
      const laborCostForecastPercentage = (stats.totalLaborCost / stats.totalForecastRevenue) * 100;
      const laborCostActualPercentage = (stats.totalLaborCost / stats.totalActualRevenue) * 100;
      const roleDiv = document.createElement('div');
      roleDiv.innerHTML = `
        <p><strong>${role}</strong></p>
        <p>Dipendenti: ${stats.totalEmployees}</p>
        <p>Ore Totali Assegnate: ${stats.totalAssignedHours}</p>
        <p>Ore Totali Rimanenti: ${stats.totalRemainingHours}</p>
        <p>Incidenza Costo del Lavoro (Previsto): ${laborCostForecastPercentage.toFixed(2)}%</p>
        <p>Incidenza Costo del Lavoro (Reale): ${laborCostActualPercentage.toFixed(2)}%</p>
        <p>Costo del Lavoro: ${stats.totalLaborCost.toFixed(2)}</p>
        <p>Produttività Prevista Totale: ${stats.totalProductivityForecast.toFixed(2)}</p>
        <p>Produttività Reale Totale: ${stats.totalProductivityActual.toFixed(2)}</p>
      `;
      elements.roleSummaryDiv.appendChild(roleDiv);
    }
  };

  const updateDashboard = () => {
    let totalAssignedHours = 0;
    let totalRemainingHours = 0;
    let totalForecastRevenue = 0;
    let totalNetForecastRevenue = 0;
    let totalActualRevenue = 0;
    let totalNetActualRevenue = 0;
    let totalHourlyCost = 0;
    let totalProductivityForecast = 0;
    let totalProductivityActual = 0;
    let totalLaborCost = 0;

    restaurant.employees.forEach(employee => {
      totalAssignedHours += (employee.weeklyHours - employee.remainingHours);
      totalRemainingHours += employee.remainingHours;
    });

    for (let day = 0; day < 7; day++) {
      const forecastRevenue = restaurant.economicData.forecastRevenue[day] || 0;
      const actualRevenue = restaurant.economicData.actualRevenue[day] || 0;
      const netForecastRevenue = forecastRevenue / 1.1;
      const netActualRevenue = actualRevenue / 1.1;

      totalForecastRevenue += forecastRevenue;
      totalNetForecastRevenue += netForecastRevenue;
      totalActualRevenue += actualRevenue;
      totalNetActualRevenue += netActualRevenue;

      const { totalCost: dailyLaborCost, totalHours } = calculateLaborCost(day);
      const productivityForecast = calculateProductivity(netForecastRevenue, day);
      const productivityActual = calculateProductivity(netActualRevenue, day);

      const laborCostPercentageForecast = (dailyLaborCost / forecastRevenue) * 100;
      const laborCostPercentageActual = (dailyLaborCost / actualRevenue) * 100;
      const actualToForecastRevenuePercentage = (actualRevenue / forecastRevenue) * 100;

      totalProductivityForecast += productivityForecast;
      totalProductivityActual += productivityActual;
      totalLaborCost += dailyLaborCost;

      document.getElementById(`netForecastRevenue${days[day]}`).textContent = netForecastRevenue.toFixed(2);
      document.getElementById(`netActualRevenue${days[day]}`).textContent = netActualRevenue.toFixed(2);
      document.getElementById(`laborCost${days[day]}`).textContent = dailyLaborCost.toFixed(2);
      document.getElementById(`productivityForecast${days[day]}`).textContent = productivityForecast.toFixed(2);
      document.getElementById(`productivityActual${days[day]}`).textContent = productivityActual.toFixed(2);
      document.getElementById(`laborCostForecast${days[day]}`).textContent = `${laborCostPercentageForecast.toFixed(2)}%`;
      document.getElementById(`laborCostActual${days[day]}`).textContent = `${laborCostPercentageActual.toFixed(2)}%`;
      document.getElementById(`actualVsForecast${days[day]}`).textContent = `${actualToForecastRevenuePercentage.toFixed(2)}%`;
    }

    const laborCostPercentageForecastTotal = (totalLaborCost / totalForecastRevenue) * 100;
    const laborCostPercentageActualTotal = (totalLaborCost / totalActualRevenue) * 100;
    const actualToForecastRevenuePercentageTotal = (totalActualRevenue / totalForecastRevenue) * 100;

    elements.hoursSummaryDiv.innerHTML = `
      <p>Ore Totali Assegnate: ${totalAssignedHours}</p>
      <p>Ore Totali Rimanenti: ${totalRemainingHours}</p>
    `;
    elements.totalForecastRevenueP.textContent = `Fatturato Previsto Totale: ${totalForecastRevenue}`;
    elements.totalNetForecastRevenueP.textContent = `Fatturato Previsto Netto Totale: ${totalNetForecastRevenue.toFixed(2)}`;
    elements.totalActualRevenueP.textContent = `Fatturato Reale Totale: ${totalActualRevenue}`;
    elements.totalNetActualRevenueP.textContent = `Fatturato Reale Netto Totale: ${totalNetActualRevenue.toFixed(2)}`;
    elements.totalHourlyCostP.textContent = `Costo Totale del Lavoro: ${totalLaborCost.toFixed(2)}`;
    elements.laborCostPercentageForecastP.textContent = `Incidenza Costo del Lavoro (Previsto): ${laborCostPercentageForecastTotal.toFixed(2)}%`;
    elements.laborCostPercentageActualP.textContent = `Incidenza Costo del Lavoro (Reale): ${laborCostPercentageActualTotal.toFixed(2)}%`;
    elements.actualToForecastRevenuePercentageP.textContent = `Fatturato Reale su Previsto: ${actualToForecastRevenuePercentageTotal.toFixed(2)}%`;
    elements.totalProductivityForecastP.textContent = `Produttività Prevista Totale: ${totalProductivityForecast.toFixed(2)}`;
    elements.totalProductivityActualP.textContent = `Produttività Reale Totale: ${totalProductivityActual.toFixed(2)}`;

    updateRoleSummary();
  };

  const saveToLocalStorage = () => {
    const storedWeeks = JSON.parse(localStorage.getItem('weeks')) || {};
    const weekKey = `${restaurant.name}_${restaurant.week}`;
    storedWeeks[weekKey] = restaurant;
    localStorage.setItem('weeks', JSON.stringify(storedWeeks));
  };

  const loadFromLocalStorage = () => {
    const storedWeeks = JSON.parse(localStorage.getItem('weeks')) || {};
    const weekKey = `${restaurant.name}_${restaurant.week}`;
    if (storedWeeks[weekKey]) {
      restaurant = storedWeeks[weekKey];
      document.getElementById('restaurantName').value = restaurant.name;
      elements.weekPicker.value = restaurant.week;
      document.querySelector('h1').textContent = `Gestione Turni Ristorante - ${restaurant.name}`;
      renderEmployees();
      renderShiftTable();
      restoreShiftSelections();
      updateDashboard();
    }
  };

  const saveAllWeeksToLocalStorage = () => {
    saveToLocalStorage();
    alert('Settimana salvata con successo!');
    updateSavedWeeksDropdown();
  };

  const loadWeekFromLocalStorage = (week) => {
    const storedWeeks = JSON.parse(localStorage.getItem('weeks'));
    if (storedWeeks[week]) {
      restaurant = storedWeeks[week];
      document.getElementById('restaurantName').value = restaurant.name;
      elements.weekPicker.value = restaurant.week;
      document.querySelector('h1').textContent = `Gestione Turni Ristorante - ${restaurant.name}`;
      renderEmployees();
      renderShiftTable();
      restoreShiftSelections();
      updateDashboard();
      alert('Settimana caricata con successo!');
    } else {
      alert('Nessun dato trovato per la settimana selezionata.');
    }
  };

  const updateSavedWeeksDropdown = () => {
    const storedWeeks = JSON.parse(localStorage.getItem('weeks')) || {};
    elements.savedWeeksSelect.innerHTML = '';
    for (const week in storedWeeks) {
      const option = document.createElement('option');
      option.value = week;
      option.textContent = week;
      elements.savedWeeksSelect.appendChild(option);
    }
  };

  const renderEmployees = () => {
    elements.employeesDiv.innerHTML = '';
    restaurant.employees.forEach((employee, index) => {
      const employeeDiv = document.createElement('div');
      employeeDiv.classList.add('employee');
      employeeDiv.dataset.empIndex = index;
      employeeDiv.innerHTML = `
        ${employee.name} (${employee.role}) - ${employee.remainingHours.toFixed(2)} ore rimanenti
        <div class="daily-hours"></div>
        <button data-index="${index}" class="edit-employee-btn btn">Modifica</button>
        <button data-index="${index}" class="delete-employee-btn btn">Elimina</button>
      `;
      elements.employeesDiv.appendChild(employeeDiv);
    });

    document.querySelectorAll('.delete-employee-btn').forEach(button => {
      button.addEventListener('click', function() {
        deleteEmployee(button.dataset.index);
      });
    });

    document.querySelectorAll('.edit-employee-btn').forEach(button => {
      button.addEventListener('click', function() {
        editEmployee(button.dataset.index);
      });
    });

    renderDailyHours();
  };

  const editEmployee = (index) => {
    const employee = restaurant.employees[index];
    const newName = prompt("Modifica nome del dipendente:", employee.name);
    const newRole = prompt("Modifica ruolo del dipendente:", employee.role);
    const newWeeklyHours = parseFloat(prompt("Modifica monte ore settimanale del dipendente:", employee.weeklyHours));

    if (newName !== null && newRole !== null && newWeeklyHours !== null) {
      employee.name = newName;
      employee.role = newRole;
      const oldWeeklyHours = employee.weeklyHours;
      employee.weeklyHours = newWeeklyHours;
      employee.remainingHours = employee.remainingHours + (newWeeklyHours - oldWeeklyHours);

      updateEmployeeHours();
      renderEmployees();
      renderShiftTable();
      restoreShiftSelections();
      updateDashboard();
      saveToLocalStorage();
    }
  };

  const deleteWeek = () => {
    if (confirm('Sei sicuro di voler eliminare la settimana selezionata?')) {
      const weekToDelete = elements.savedWeeksSelect.value;
      const storedWeeks = JSON.parse(localStorage.getItem('weeks')) || {};
      delete storedWeeks[weekToDelete];
      localStorage.setItem('weeks', JSON.stringify(storedWeeks));
      updateSavedWeeksDropdown();
      if (weekToDelete === `${restaurant.name}_${restaurant.week}`) {
        restaurant = {
          name: '',
          week: '',
          employees: [],
          shifts: Array(7).fill(null).map(() => []),
          economicData: {},
          history: []
        };
        document.getElementById('restaurantName').value = '';
        elements.weekPicker.value = '';
        document.querySelector('h1').textContent = 'Gestione Turni Ristorante';
        renderEmployees();
        renderShiftTable();
        updateDashboard();
        saveToLocalStorage();
      }
      alert('Settimana eliminata con successo!');
    }
  };

  const deleteEmployee = (index) => {
    restaurant.employees.splice(index, 1);
    restaurant.shifts.forEach(dayShifts => dayShifts.splice(index, 1));
    renderEmployees();
    renderShiftTable();
    updateDashboard();
    saveToLocalStorage();
  };

  const deleteAllEmployees = () => {
    if (confirm('Sei sicuro di voler eliminare tutti i dipendenti?')) {
      restaurant.employees = [];
      restaurant.shifts = Array(7).fill(null).map(() => []);
      renderEmployees();
      renderShiftTable();
      updateDashboard();
      saveToLocalStorage();
    }
  };

  const deleteEconomicData = () => {
    if (confirm('Sei sicuro di voler eliminare tutti i dati economici?')) {
      restaurant.economicData = {};
      document.getElementById('generalHourlyCost').value = '';
      document.getElementById('averageHourlyCostSala').value = '';
      document.getElementById('averageHourlyCostBanco').value = '';
      document.getElementById('averageHourlyCostCucina').value = '';
      document.getElementById('averageHourlyCostLaboratorio').value = '';
      for (let day = 0; day < 7; day++) {
        document.getElementById(`forecastRevenue${days[day]}`).value = '';
        document.getElementById(`actualRevenue${days[day]}`).value = '';
        document.getElementById(`netForecastRevenue${days[day]}`).textContent = '0';
        document.getElementById(`netActualRevenue${days[day]}`).textContent = '0';
        document.getElementById(`laborCost${days[day]}`).textContent = '0';
        document.getElementById(`productivityForecast${days[day]}`).textContent = '0';
        document.getElementById(`productivityActual${days[day]}`).textContent = '0';
        document.getElementById(`laborCostForecast${days[day]}`).textContent = '0%';
        document.getElementById(`laborCostActual${days[day]}`).textContent = '0%';
        document.getElementById(`actualVsForecast${days[day]}`).textContent = '0%';
      }
      updateDashboard();
      saveToLocalStorage();
    }
  };

  const restoreShiftSelections = () => {
    restaurant.shifts.forEach((dayShifts, day) => {
      dayShifts.forEach((shifts, empIndex) => {
        shifts.forEach(time => {
          const cell = document.querySelector(`.shift-table[data-day="${day}"] td[data-emp-index="${empIndex}"][data-time="${time}"]`);
          if (cell) {
            cell.classList.add('selected');
          }
        });
      });
    });
  };

  const applyGeneralHourlyCost = () => {
    const generalCost = parseFloat(elements.generalHourlyCost.value);
    if (!isNaN(generalCost)) {
      document.getElementById('averageHourlyCostSala').value = generalCost;
      document.getElementById('averageHourlyCostBanco').value = generalCost;
      document.getElementById('averageHourlyCostCucina').value = generalCost;
      document.getElementById('averageHourlyCostLaboratorio').value = generalCost;
    }
  };

  elements.generalHourlyCost.addEventListener('input', applyGeneralHourlyCost);

  elements.saveRestaurantButton.addEventListener('click', function() {
    restaurant.name = document.getElementById('restaurantName').value;
    restaurant.week = elements.weekPicker.value;
    document.querySelector('h1').textContent = `Gestione Turni Ristorante - ${restaurant.name}`;
    saveToLocalStorage();
  });

  elements.addEmployeeButton.addEventListener('click', function() {
    const employeeName = document.getElementById('employeeName').value;
    const employeeRole = document.getElementById('employeeRole').value;
    const weeklyHours = parseInt(document.getElementById('weeklyHours').value, 10);
    restaurant.employees.push({ name: employeeName, role: employeeRole, weeklyHours: weeklyHours, remainingHours: weeklyHours });
    restaurant.shifts.forEach(dayShifts => dayShifts.push([]));
    saveToLocalStorage();
    renderEmployees();
    renderShiftTable();
    restoreShiftSelections();
    updateDashboard();
  });

  elements.addEconomicDataButton.addEventListener('click', function() {
    const averageHourlyCostSala = parseFloat(document.getElementById('averageHourlyCostSala').value);
    const averageHourlyCostBanco = parseFloat(document.getElementById('averageHourlyCostBanco').value);
    const averageHourlyCostCucina = parseFloat(document.getElementById('averageHourlyCostCucina').value);
    const averageHourlyCostLaboratorio = parseFloat(document.getElementById('averageHourlyCostLaboratorio').value);
    const forecastRevenue = [
      parseFloat(document.getElementById('forecastRevenueMonday').value),
      parseFloat(document.getElementById('forecastRevenueTuesday').value),
      parseFloat(document.getElementById('forecastRevenueWednesday').value),
      parseFloat(document.getElementById('forecastRevenueThursday').value),
      parseFloat(document.getElementById('forecastRevenueFriday').value),
      parseFloat(document.getElementById('forecastRevenueSaturday').value),
      parseFloat(document.getElementById('forecastRevenueSunday').value)
    ];
    const actualRevenue = [
      parseFloat(document.getElementById('actualRevenueMonday').value),
      parseFloat(document.getElementById('actualRevenueTuesday').value),
      parseFloat(document.getElementById('actualRevenueWednesday').value),
      parseFloat(document.getElementById('actualRevenueThursday').value),
      parseFloat(document.getElementById('actualRevenueFriday').value),
      parseFloat(document.getElementById('actualRevenueSaturday').value),
      parseFloat(document.getElementById('actualRevenueSunday').value)
    ];
    restaurant.economicData = { 
      averageHourlyCostSala, 
      averageHourlyCostBanco, 
      averageHourlyCostCucina, 
      averageHourlyCostLaboratorio,
      forecastRevenue, 
      actualRevenue 
    };
    saveToLocalStorage();
    updateDashboard();
  });

  elements.deleteWeekButton.addEventListener('click', deleteWeek);
  elements.deleteAllEmployeesButton.addEventListener('click', deleteAllEmployees);
  elements.deleteEconomicDataButton.addEventListener('click', deleteEconomicData);

  elements.saveShiftsButton.addEventListener('click', function() {
    saveToLocalStorage();
  });

  elements.clearShiftsButton.addEventListener('click', function() {
    restaurant.shifts = Array(7).fill(null).map(() => restaurant.employees.map(() => []));
    restaurant.employees.forEach(employee => employee.remainingHours = employee.weeklyHours);
    renderShiftTable();
    renderEmployees();
    updateDashboard();
    saveToLocalStorage();
  });

  elements.saveAllButton.addEventListener('click', saveAllWeeksToLocalStorage);
  elements.loadAllButton.addEventListener('click', function() {
    const week = elements.savedWeeksSelect.value;
    loadWeekFromLocalStorage(week);
  });

  elements.loadWeekButton.addEventListener('click', function() {
    const week = elements.savedWeeksSelect.value;
    loadWeekFromLocalStorage(week);
  });

  elements.createNewButton.addEventListener('click', function() {
    restaurant = {
      name: '',
      week: '',
      employees: [],
      shifts: Array(7).fill(null).map(() => []),
      economicData: {},
      history: []
    };
    document.getElementById('restaurantName').value = '';
    elements.weekPicker.value = '';
    document.querySelector('h1').textContent = 'Gestione Turni Ristorante';
    renderEmployees();
    renderShiftTable();
    updateDashboard();
  });

  const generatePdf = () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    html2canvas(document.body).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = canvas.height * imgWidth / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        doc.addPage();
        doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      doc.save(`${restaurant.name}_Settimana_${restaurant.week}.pdf`);
    });
  };

  elements.printPdfButton.addEventListener('click', generatePdf);

  for (let day = 0; day < 7; day++) {
    generateShiftTable(day);
  }

  loadFromLocalStorage();
  updateSavedWeeksDropdown();
});
