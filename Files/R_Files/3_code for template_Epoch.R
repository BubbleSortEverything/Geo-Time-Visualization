ex <- readLines("template_Epoch.txt") # the template
data <- read.csv("data.csv") # the csv file with the Epoch data

for (i in 2:nrow(data)){
  ex1 <- gsub(pattern = "Example", replace = as.character(data[i,2]), x = ex) # the name of the concept
  ex1 <- gsub(pattern = "REPLACE1", replace = as.character(data[i,5]), x = ex1) # broader
  ex1 <- gsub(pattern = "REPLACE2", replace = as.character(data[i,6]), x = ex1) # broaderTransitive
  ex1 <- gsub(pattern = "REPLACE4", replace = as.character(data[i-1,2]), x = ex1) # the concept above the present concept as the end of the present concept
  ex1 <- gsub(pattern = "REPLACE5", replace = as.character(data[i,4]), x = ex1) # bottom age of the concept
  if(i == 2){
    result <- ex1
  }else{
    result <- c(result,ex1)
  }
}
write(result, "result.ttl")
