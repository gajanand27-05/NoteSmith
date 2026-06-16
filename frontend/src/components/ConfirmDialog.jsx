import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';

const ConfirmDialog = ({ open, title, message, confirmLabel = 'Delete', cancelLabel = 'Cancel', confirmColor = 'error', onConfirm, onCancel }) => (
  <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
    <DialogTitle>{title}</DialogTitle>
    <DialogContent>
      <DialogContentText>{message}</DialogContentText>
    </DialogContent>
    <DialogActions sx={{ p: 2, pt: 0 }}>
      <Button onClick={onCancel} color="inherit">{cancelLabel}</Button>
      <Button onClick={onConfirm} variant="contained" color={confirmColor} autoFocus>{confirmLabel}</Button>
    </DialogActions>
  </Dialog>
);

export default ConfirmDialog;
