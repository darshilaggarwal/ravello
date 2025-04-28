import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getTransactions } from '../redux/actions/userActions';
import { Box, Typography, Paper, Divider, Button, CircularProgress, Pagination } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { formatDistance } from 'date-fns';
import toast from 'react-hot-toast';

const Wallet = () => {
  const dispatch = useDispatch();
  const { profile, transactions, loading } = useSelector((state) => state.user);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        await dispatch(getTransactions(page, pageSize));
      } catch (error) {
        toast.error(error.message || 'Failed to load transactions');
      }
    };

    fetchTransactions();
  }, [dispatch, page, pageSize]);

  // Format transaction type for display
  const formatTransactionType = (type) => {
    const types = {
      DEPOSIT: 'Deposit',
      WITHDRAWAL: 'Withdrawal',
      GAME_WIN: 'Game Win',
      GAME_LOSS: 'Game Loss',
      BONUS: 'Bonus'
    };
    return types[type] || type;
  };

  // Format game type for display
  const formatGameType = (type) => {
    if (!type) return 'N/A';
    
    const types = {
      DICE: 'Dice',
      CRASH: 'Crash',
      MINES: 'Mines'
    };
    return types[type] || type;
  };

  // DataGrid columns
  const columns = [
    {
      field: 'createdAt',
      headerName: 'Date',
      flex: 1,
      valueGetter: (params) => new Date(params.row.createdAt),
      renderCell: (params) => (
        <Typography variant="body2">
          {formatDistance(new Date(params.row.createdAt), new Date(), { addSuffix: true })}
        </Typography>
      )
    },
    {
      field: 'type',
      headerName: 'Type',
      flex: 1,
      renderCell: (params) => (
        <Typography variant="body2">{formatTransactionType(params.row.type)}</Typography>
      )
    },
    {
      field: 'gameType',
      headerName: 'Game',
      flex: 1,
      renderCell: (params) => (
        <Typography variant="body2">{formatGameType(params.row.gameType)}</Typography>
      )
    },
    {
      field: 'amount',
      headerName: 'Amount',
      flex: 1,
      renderCell: (params) => (
        <Typography 
          variant="body2" 
          color={params.row.amount > 0 ? 'success.main' : 'error.main'}
          fontWeight="bold"
        >
          {params.row.amount > 0 ? '+' : ''}{params.row.amount.toFixed(2)}
        </Typography>
      )
    },
    {
      field: 'balance',
      headerName: 'Balance',
      flex: 1,
      renderCell: (params) => (
        <Typography variant="body2">{params.row.balance.toFixed(2)}</Typography>
      )
    }
  ];

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 4 }}>Wallet</Typography>
      
      {/* Balance Card */}
      <Paper sx={{ p: 3, mb: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ mb: 1 }}>Current Balance</Typography>
        <Typography variant="h3" sx={{ mb: 2, fontWeight: 'bold' }}>
          ${profile?.balance?.toFixed(2) || '0.00'}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="contained" color="primary">Deposit</Button>
          <Button variant="outlined" color="primary">Withdraw</Button>
        </Box>
      </Paper>
      
      <Divider sx={{ my: 4 }} />
      
      {/* Transactions Table */}
      <Typography variant="h6" sx={{ mb: 3 }}>Transaction History</Typography>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Box sx={{ height: 400, width: '100%' }}>
            <DataGrid
              rows={transactions?.items || []}
              columns={columns}
              pageSize={pageSize}
              rowsPerPageOptions={[pageSize]}
              disableSelectionOnClick
              disableColumnMenu
              hideFooter
              getRowId={(row) => row._id}
              loading={loading}
              sx={{ border: 'none' }}
            />
          </Box>
          
          {/* Pagination */}
          {transactions?.totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={transactions.totalPages}
                page={page}
                onChange={(e, newPage) => setPage(newPage)}
                color="primary"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default Wallet; 