import {
  GET_PROFILE_REQUEST,
  GET_PROFILE_SUCCESS,
  GET_PROFILE_FAILURE,
  UPDATE_PROFILE_REQUEST,
  UPDATE_PROFILE_SUCCESS,
  UPDATE_PROFILE_FAILURE,
  UPDATE_PASSWORD_REQUEST,
  UPDATE_PASSWORD_SUCCESS,
  UPDATE_PASSWORD_FAILURE,
  GET_TRANSACTIONS_REQUEST,
  GET_TRANSACTIONS_SUCCESS,
  GET_TRANSACTIONS_FAILURE,
  UPDATE_BALANCE
} from '../actions/types';

const initialState = {
  profile: null,
  transactions: [],
  loading: false,
  error: null,
  message: null
};

const userReducer = (state = initialState, action) => {
  switch (action.type) {
    case GET_PROFILE_REQUEST:
    case UPDATE_PROFILE_REQUEST:
    case UPDATE_PASSWORD_REQUEST:
    case GET_TRANSACTIONS_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
        message: null
      };
      
    case GET_PROFILE_SUCCESS:
      console.log('User reducer: GET_PROFILE_SUCCESS with payload:', action.payload);
      return {
        ...state,
        profile: action.payload,
        loading: false,
        error: null
      };
      
    case UPDATE_PROFILE_SUCCESS:
      return {
        ...state,
        profile: action.payload,
        loading: false,
        error: null,
        message: 'Profile updated successfully'
      };
      
    case UPDATE_PASSWORD_SUCCESS:
      return {
        ...state,
        loading: false,
        error: null,
        message: action.payload || 'Password updated successfully'
      };
      
    case GET_TRANSACTIONS_SUCCESS:
      return {
        ...state,
        transactions: action.payload,
        loading: false,
        error: null
      };
      
    case GET_PROFILE_FAILURE:
    case UPDATE_PROFILE_FAILURE:
    case UPDATE_PASSWORD_FAILURE:
    case GET_TRANSACTIONS_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload
      };
      
    case UPDATE_BALANCE:
      return {
        ...state,
        profile: {
          ...state.profile,
          balance: action.payload
        }
      };
      
    default:
      return state;
  }
};

export default userReducer; 