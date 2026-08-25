import { Request, Response } from 'express';
import prisma from '../config/prisma';

// 1. Tüm kitapları listeleme (Arama ve filtreleme destekli)
export const getBooks = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, category } = req.query;

    const whereClause: any = {};

    if (category) {
      whereClause.category = {
        equals: String(category),
        mode: 'insensitive'
      };
    }

    if (search) {
      const searchStr = String(search);
      whereClause.OR = [
        { title: { contains: searchStr, mode: 'insensitive' } },
        { author: { contains: searchStr, mode: 'insensitive' } },
        { isbn: { contains: searchStr, mode: 'insensitive' } }
      ];
    }

    const books = await prisma.book.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      status: 'success',
      results: books.length,
      data: { books }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Kitaplar listelenirken sunucu hatası oluştu.',
      error: error.message
    });
  }
};

// 2. Tek bir kitabın detayını getirme
export const getBookById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const book = await prisma.book.findUnique({
      where: { id }
    });

    if (!book) {
      res.status(404).json({
        status: 'error',
        message: 'Belirtilen ID ile eşleşen kitap bulunamadı.'
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: { book }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Kitap detayı alınırken sunucu hatası oluştu.',
      error: error.message
    });
  }
};

// 3. Yeni kitap ekleme (Sadece ADMIN ve LIBRARIAN)
export const createBook = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      title,
      isbn,
      author,
      publisher,
      category,
      totalCopies,
      availableCopies,
      locationShelf,
      coverUrl,
      pdfUrl,
      description
    } = req.body;

    if (!title || !isbn || !author || !publisher || !category || !locationShelf) {
      res.status(400).json({
        status: 'error',
        message: 'Başlık, ISBN, yazar, yayınevi, kategori ve raf konumu zorunludur.'
      });
      return;
    }

    // ISBN mükerrerlik kontrolü
    const existingBook = await prisma.book.findUnique({
      where: { isbn }
    });

    if (existingBook) {
      res.status(409).json({
        status: 'error',
        message: 'Bu ISBN numarasına sahip bir kitap zaten mevcut.'
      });
      return;
    }

    const total = totalCopies !== undefined ? Number(totalCopies) : 1;
    const available = availableCopies !== undefined ? Number(availableCopies) : total;

    const newBook = await prisma.book.create({
      data: {
        title,
        isbn,
        author,
        publisher,
        category,
        totalCopies: total,
        availableCopies: available,
        locationShelf,
        coverUrl: coverUrl || null,
        pdfUrl: pdfUrl || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        description: description || null
      }
    });

    res.status(201).json({
      status: 'success',
      message: 'Kitap başarıyla kütüphaneye eklendi.',
      data: { book: newBook }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Kitap eklenirken sunucu hatası oluştu.',
      error: error.message
    });
  }
};

// 4. Kitap bilgilerini güncelleme (Sadece ADMIN ve LIBRARIAN)
export const updateBook = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      title,
      isbn,
      author,
      publisher,
      category,
      totalCopies,
      availableCopies,
      locationShelf,
      coverUrl,
      pdfUrl,
      description
    } = req.body;

    // Kitap varlığı kontrolü
    const existingBook = await prisma.book.findUnique({
      where: { id }
    });

    if (!existingBook) {
      res.status(404).json({
        status: 'error',
        message: 'Güncellenecek kitap bulunamadı.'
      });
      return;
    }

    // ISBN değiştiriliyorsa çakışma kontrolü
    if (isbn && isbn !== existingBook.isbn) {
      const isbnCheck = await prisma.book.findUnique({
        where: { isbn }
      });
      if (isbnCheck) {
        res.status(409).json({
          status: 'error',
          message: 'Girdiğiniz yeni ISBN başka bir kitaba aittir.'
        });
        return;
      }
    }

    const updatedBook = await prisma.book.update({
      where: { id },
      data: {
        title: title !== undefined ? title : existingBook.title,
        isbn: isbn !== undefined ? isbn : existingBook.isbn,
        author: author !== undefined ? author : existingBook.author,
        publisher: publisher !== undefined ? publisher : existingBook.publisher,
        category: category !== undefined ? category : existingBook.category,
        totalCopies: totalCopies !== undefined ? Number(totalCopies) : existingBook.totalCopies,
        availableCopies: availableCopies !== undefined ? Number(availableCopies) : existingBook.availableCopies,
        locationShelf: locationShelf !== undefined ? locationShelf : existingBook.locationShelf,
        coverUrl: coverUrl !== undefined ? coverUrl : existingBook.coverUrl,
        description: description !== undefined ? description : existingBook.description
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'Kitap bilgileri başarıyla güncellendi.',
      data: { book: updatedBook }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Kitap güncellenirken sunucu hatası oluştu.',
      error: error.message
    });
  }
};

// 5. Kitap silme (Sadece ADMIN)
export const deleteBook = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existingBook = await prisma.book.findUnique({
      where: { id }
    });

    if (!existingBook) {
      res.status(404).json({
        status: 'error',
        message: 'Silinecek kitap bulunamadı.'
      });
      return;
    }

    await prisma.book.delete({
      where: { id }
    });

    res.status(200).json({
      status: 'success',
      message: 'Kitap başarıyla silindi.'
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Kitap silinirken sunucu hatası oluştu.',
      error: error.message
    });
  }
};
