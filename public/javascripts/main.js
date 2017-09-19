document.addEventListener('DOMContentLoaded', main);

function editPickerChanged(evnt) {
  var editButton = document.getElementById('editSubmitButton');

  var editPicker = document.getElementById('schedules-list-picker');
  editPicker.addEventListener('change', editPickerChanged);
  var picked = editPicker.options[editPicker.selectedIndex].value;

  editButton.href = '/scheduled/edit/' + picked;
}

function deletePickerChanged(evnt) {
  var repoClosingScheduleIdentifier = document.getElementById('repoClosingScheduleIdentifier');
  var picker = document.getElementById('delete-list-picker');
  repoClosingScheduleIdentifier.value = picker.options[picker.selectedIndex].value;
}

function main() {
  var editPicker = document.getElementById('schedules-list-picker');
  if(editPicker) {
    editPicker.addEventListener('change', editPickerChanged);
    var picked = editPicker.options[editPicker.selectedIndex].value;

    var editButton = document.getElementById('editSubmitButton');
    editButton.href = '/scheduled/edit/' + picked;
  }
  var deleteEntryPicker = document.getElementById('delete-list-picker');
  if(deleteEntryPicker) {
    deleteEntryPicker.addEventListener('change', deletePickerChanged);
    var repoClosingScheduleIdentifier = document.getElementById('repoClosingScheduleIdentifier');
    repoClosingScheduleIdentifier.value = deleteEntryPicker.options[deleteEntryPicker.selectedIndex].value;
  }
}
