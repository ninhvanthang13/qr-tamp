'use strict';

// Cấu hình quy tắc sinh mã tem (Stamp Generation Configuration)
// ZIGZAG quy định chu kỳ chữ cái (A-Z rồi Y-B)
const ZIGZAG = 50;
const BASE_URL = 'https://traceviet.intrustdss.vn';

const STAMP_CONFIG = {
  CONG: {
    name: 'Công',
    urlPath: '/2/',
    // Định dạng cấu trúc: Tiền tố + Năm + Mã SP + Chữ + Số
    format: ['PREFIX', 'YEAR', 'PRODUCT_CODE', 'LETTERS', 'DIGITS'],
    prefix: 'C',
    productCodeLen: 3,
    letterCount: 1,
    digitCount: 5,
    qrType: 'new',
    oldNumIdLen: 0,
    oldDomain: '',
    regex: /^C\d{2}[A-Z]{3}[A-Z]\d{5}$/
  },
  THUNG: {
    name: 'Thùng',
    urlPath: '/1/',
    // Định dạng cấu trúc: Tiền tố + Năm + Chữ + Số
    format: ['PREFIX', 'YEAR', 'LETTERS', 'DIGITS'],
    prefix: 'T',
    productCodeLen: 0, // Không dùng mã sản phẩm
    letterCount: 2,
    digitCount: 7,
    qrType: 'new',
    oldNumIdLen: 0,
    oldDomain: '',
    regex: /^T\d{2}[A-Z]{2}\d{7}$/
  },
  SAN_PHAM: {
    name: 'Sản phẩm',
    urlPath: '/02/',
    // Định dạng cấu trúc: Năm + Mã SP + Chữ + Số
    format: ['YEAR', 'PRODUCT_CODE', 'LETTERS', 'DIGITS'],
    prefix: '',
    productCodeLen: 3,
    letterCount: 2,
    digitCount: 5,
    qrType: 'new',
    oldNumIdLen: 0,
    oldDomain: '',
    regex: /^\d{2}[A-Z]{3}[A-Z]{2}\d{5}$/
  }
};

module.exports = {
  ZIGZAG,
  BASE_URL,
  STAMP_CONFIG
};
